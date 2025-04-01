// Service Layer Pattern for Booking Business Logic

import mongoose from 'mongoose';
import { IBooking } from '../models/booking.model';
import { BookingRepository } from '../patterns/repository/BookingRepository';
import { ShowtimeRepository } from '../patterns/repository/ShowtimeRepository';
import { SeatReservation, ISeatReservation } from '../models/seat.reservation.model';
import { TicketFactory } from '../patterns/factory/TicketFactory';
import { PaymentProcessor } from '../patterns/strategy/PaymentStrategy';
import { NotificationService, NotificationData } from '../patterns/observer/NotificationSystem';
import { UserService } from './user.service';

interface BookingRequest {
  userId: string;
  showtimeId: string;
  seatIds: string[];
  paymentMethod: string;
  paymentDetails: any;
}

export class BookingService {
  private bookingRepository: BookingRepository;
  private showtimeRepository: ShowtimeRepository;
  private userService: UserService;
  private notificationService: NotificationService;

  constructor() {
    this.bookingRepository = new BookingRepository();
    this.showtimeRepository = new ShowtimeRepository();
    this.userService = new UserService();
    this.notificationService = NotificationService.getInstance();
  }

  async createBooking(bookingRequest: BookingRequest): Promise<IBooking> {
    // Validate input
    if (!bookingRequest.userId || !bookingRequest.showtimeId || !bookingRequest.seatIds.length) {
      throw new Error('Missing required booking information');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify showtime exists and is active
      const showtime = await this.showtimeRepository.findById(bookingRequest.showtimeId);
      if (!showtime) {
        throw new Error('Showtime not found');
      }
      if (!showtime.isActive) {
        throw new Error('This showtime is no longer available');
      }

      // Check if start time has passed
      if (new Date(showtime.startTime) < new Date()) {
        throw new Error('This showtime has already started');
      }

      // Check if seats are available
      const seatAvailability = await SeatReservation.find({
        showtimeId: bookingRequest.showtimeId,
        seatId: { $in: bookingRequest.seatIds },
        status: { $ne: 'available' }
      });

      if (seatAvailability.length > 0) {
        throw new Error('One or more selected seats are not available');
      }

      // Calculate total amount
      let totalAmount = 0;
      for (const seatId of bookingRequest.seatIds) {
        // Get seat type (would need to query seat details in a real implementation)
        const seatType = 'standard'; // Placeholder - would be determined from seat data
        
        // Use Factory Pattern to create appropriate ticket
        const ticket = TicketFactory.createTicket(
          seatType, 
          showtime.price[seatType as keyof typeof showtime.price]
        );
        
        totalAmount += ticket.price;
      }

      // Create a new booking with pending payment status
      const booking = await this.bookingRepository.create({
        userId: new mongoose.Types.ObjectId(bookingRequest.userId),
        showtimeId: new mongoose.Types.ObjectId(bookingRequest.showtimeId),
        seats: bookingRequest.seatIds.map(id => new mongoose.Types.ObjectId(id)),
        totalAmount,
        paymentStatus: 'pending',
        bookingStatus: 'reserved',
        paymentMethod: bookingRequest.paymentMethod,
        bookedAt: new Date()
      });

      await session.commitTransaction();

      // Send notification
      const user = await this.userService.getUserById(bookingRequest.userId);
      if (user) {
        const notificationData: NotificationData = {
          userId: user.id.toString(),
          email: user.email,
          phone: user.phone,
          bookingId: booking._id ? booking._id.toString() : '',
          movieTitle: showtime.movieId ? (showtime.movieId as any).title : 'Movie',
          theaterName: showtime.screenId ? 
            ((showtime.screenId as any).theaterId ? (showtime.screenId as any).theaterId.name : 'Theater') 
            : 'Theater',
          showtime: showtime.startTime,
          seats: bookingRequest.seatIds,
          amount: totalAmount
        };

        await this.notificationService.notify('booking.created', notificationData);
      }

      return booking;
    } catch (error: any) {
      await session.abortTransaction();
      throw new Error(`Failed to create booking: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async processPayment(bookingId: string, paymentProcessor: PaymentProcessor, paymentDetails: any): Promise<IBooking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.paymentStatus === 'completed') {
      throw new Error('Payment has already been processed for this booking');
    }

    try {
      // Process the payment using Strategy Pattern
      const paymentResult = await paymentProcessor.processPayment(
        booking.totalAmount,
        'VND', // Currency - would be configurable in a real implementation
        paymentDetails
      );

      if (!paymentResult.success) {
        // Update booking with failed payment status
        await this.bookingRepository.update(bookingId, {
          paymentStatus: 'failed',
        });

        throw new Error(`Payment failed: ${paymentResult.message}`);
      }

      // Update booking with successful payment
      const updatedBooking = await this.bookingRepository.update(bookingId, {
        paymentStatus: 'completed',
        bookingStatus: 'confirmed',
        transactionId: paymentResult.transactionId
      });

      // Confirm the booking (update seat reservations)
      await this.bookingRepository.confirmBooking(bookingId);

      // Send notification
      const showtime = await this.showtimeRepository.findById(booking.showtimeId.toString());
      const user = await this.userService.getUserById(booking.userId.toString());
      
      if (user) {
        const notificationData: NotificationData = {
          userId: user.id.toString(),
          email: user.email,
          phone: user.phone,
          bookingId: booking._id ? booking._id.toString() : '',
          movieTitle: showtime?.movieId ? (showtime.movieId as any).title : 'Movie',
          amount: booking.totalAmount,
          transactionId: paymentResult.transactionId
        };

        await this.notificationService.notify('payment.success', notificationData);
        await this.notificationService.notify('booking.confirmed', notificationData);
      }

      return updatedBooking!;
    } catch (error: any) {
      // Send failed payment notification
      const user = await this.userService.getUserById(booking.userId.toString());
      if (user) {
        const notificationData: NotificationData = {
          userId: user.id.toString(),
          email: user.email,
          phone: user.phone,
          bookingId: booking._id ? booking._id.toString() : '',
          amount: booking.totalAmount
        };

        await this.notificationService.notify('payment.failed', notificationData);
      }

      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  async cancelBooking(bookingId: string, userId: string): Promise<IBooking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify user owns this booking
    if (booking.userId.toString() !== userId) {
      throw new Error('Unauthorized: You cannot cancel this booking');
    }

    // Check if booking can be cancelled (e.g., not too close to showtime)
    const showtime = await this.showtimeRepository.findById(booking.showtimeId.toString());
    if (!showtime) {
      throw new Error('Showtime information not available');
    }

    // Example: Cannot cancel within 3 hours of showtime
    const cancellationDeadline = new Date(showtime.startTime);
    cancellationDeadline.setHours(cancellationDeadline.getHours() - 3);

    if (new Date() > cancellationDeadline) {
      throw new Error('Cannot cancel booking less than 3 hours before showtime');
    }

    // Process refund if payment was made
    if (booking.paymentStatus === 'completed' && booking.transactionId) {
      // In a real implementation, this would use the PaymentProcessor to issue a refund
      // For this example, we'll just mark it as refunded
      await this.bookingRepository.update(bookingId, {
        paymentStatus: 'refunded'
      });
    }

    // Cancel the booking
    const cancelledBooking = await this.bookingRepository.cancelBooking(bookingId);
    if (!cancelledBooking) {
      throw new Error('Failed to cancel booking');
    }

    // Send notification
    const user = await this.userService.getUserById(booking.userId.toString());
    if (user) {
      const notificationData: NotificationData = {
        userId: user.id.toString(),
        email: user.email,
        phone: user.phone,
        bookingId: booking._id ? booking._id.toString() : '',
        movieTitle: showtime.movieId ? (showtime.movieId as any).title : 'Movie',
        theaterName: showtime.screenId ? 
          ((showtime.screenId as any).theaterId ? (showtime.screenId as any).theaterId.name : 'Theater') 
          : 'Theater',
        showtime: showtime.startTime
      };

      await this.notificationService.notify('booking.cancelled', notificationData);
    }

    return cancelledBooking;
  }

  async getUserBookings(userId: string): Promise<IBooking[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return await this.bookingRepository.findByUserId(userId);
  }

  async getBookingDetails(bookingId: string, userId: string): Promise<IBooking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Security check: Ensure the user owns this booking or is an admin
    // In a real app, you'd check user roles
    if (booking.userId.toString() !== userId) {
      throw new Error('Unauthorized: You cannot view this booking');
    }

    return booking;
  }
}