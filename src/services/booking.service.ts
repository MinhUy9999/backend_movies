// Service Layer Pattern for Booking Business Logic

import mongoose from 'mongoose';
import { IBooking } from '../models/booking.model';
import { BookingRepository } from '../patterns/repository/BookingRepository';
import { ShowtimeRepository } from '../patterns/repository/ShowtimeRepository';
import { Seat } from '../models/seat.model';
import { TicketFactory } from '../patterns/factory/TicketFactory';
import { PaymentProcessor } from '../patterns/strategy/PaymentStrategy';
import { NotificationService, NotificationData } from '../patterns/observer/NotificationSystem';
import { UserService } from './user.service';
import webSocketManager from '../patterns/singleton/WebSocketManager';
import socketService from '../socket/socket.service';

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
      const showtime = await this.showtimeRepository.findById(bookingRequest.showtimeId);
      if (!showtime) {
        throw new Error('Showtime not found');
      }
      if (!showtime.isActive) {
        throw new Error('This showtime is no longer available');
      }

      if (new Date(showtime.startTime) < new Date()) {
        throw new Error('This showtime has already started');
      }

      const seatAvailability = await Seat.find({
        _id: { $in: bookingRequest.seatIds },
        showtimeId: bookingRequest.showtimeId,
        status: { $ne: 'available' }
      });

      if (seatAvailability.length > 0) {
        throw new Error('One or more selected seats are not available');
      }

      // Calculate total amount
      let totalAmount = 0;
      for (const seatId of bookingRequest.seatIds) {
        const seatData = await Seat.findById(seatId);
        const seatType = seatData ? seatData.seatType : 'standard';
        
        const ticket = TicketFactory.createTicket(
          seatType, 
          showtime.price[seatType as keyof typeof showtime.price]
        );
        
        totalAmount += ticket.price;
      }

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

      try {
        if (booking && booking._id) {
          const bookingId: string = typeof booking._id === 'object' 
            ? booking._id.toString() 
            : String(booking._id);
            
            socketService.startBookingTimer(bookingRequest.userId, bookingId);
            socketService.notifySeatsUpdated(bookingRequest.showtimeId);
        }
      } catch (wsError) {
        console.error('WebSocket Error:', wsError);
      }

      const user = await this.userService.getUserById(bookingRequest.userId);
      if (user) {
        const bookingId: string = booking && booking._id 
          ? (typeof booking._id === 'object' ? booking._id.toString() : String(booking._id)) 
          : '';
          
        const notificationData: NotificationData = {
          userId: user.id.toString(),
          email: user.email,
          phone: user.phone,
          bookingId: bookingId,
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

      // Stop the WebSocket booking timer
      try {
        if (booking.userId) {
          const userId: string = typeof booking.userId === 'object'
            ? booking.userId.toString()
            : String(booking.userId);
            
          webSocketManager.stopBookingTimer(userId, bookingId);
        }
      } catch (wsError) {
        console.error('WebSocket Error:', wsError);
      }

      // Update booking with successful payment
      const updatedBooking = await this.bookingRepository.update(bookingId, {
        paymentStatus: 'completed',
        bookingStatus: 'confirmed',
        transactionId: paymentResult.transactionId
      });

      // Confirm the booking (update seat statuses)
      await this.bookingRepository.confirmBooking(bookingId);

      // Notify about seats update
      try {
        if (booking.showtimeId) {
          const showtimeId: string = typeof booking.showtimeId === 'object'
            ? booking.showtimeId.toString()
            : String(booking.showtimeId);
            
          webSocketManager.notifySeatsUpdated(showtimeId);
        }
      } catch (wsError) {
        console.error('WebSocket Error:', wsError);
      }

      // Send notification
      const showtime = await this.showtimeRepository.findById(booking.showtimeId.toString());
      const user = await this.userService.getUserById(booking.userId.toString());
      
      if (user) {
        const bookingIdStr: string = booking._id ? 
          (typeof booking._id === 'object' ? booking._id.toString() : String(booking._id)) 
          : '';
            
        const notificationData: NotificationData = {
          userId: user.id.toString(),
          email: user.email,
          phone: user.phone,
          bookingId: bookingIdStr,
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
        const bookingIdStr: string = booking._id ? 
          (typeof booking._id === 'object' ? booking._id.toString() : String(booking._id)) 
          : '';
            
        const notificationData: NotificationData = {
          userId: user.id.toString(),
          email: user.email,
          phone: user.phone,
          bookingId: bookingIdStr,
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

    // Stop the WebSocket booking timer
    try {
      webSocketManager.stopBookingTimer(userId, bookingId);
    } catch (wsError) {
      console.error('WebSocket Error:', wsError);
    }

    // Cancel the booking
    const cancelledBooking = await this.bookingRepository.cancelBooking(bookingId);
    if (!cancelledBooking) {
      throw new Error('Failed to cancel booking');
    }

    // Notify about seats update
    try {
      if (booking.showtimeId) {
        const showtimeId: string = typeof booking.showtimeId === 'object'
          ? booking.showtimeId.toString()
          : String(booking.showtimeId);
          
        webSocketManager.notifySeatsUpdated(showtimeId);
      }
    } catch (wsError) {
      console.error('WebSocket Error:', wsError);
    }

    // Send notification
    const user = await this.userService.getUserById(booking.userId.toString());
    if (user) {
      const bookingIdStr: string = booking._id ? 
        (typeof booking._id === 'object' ? booking._id.toString() : String(booking._id)) 
        : '';
          
      const notificationData: NotificationData = {
        userId: user.id.toString(),
        email: user.email,
        phone: user.phone,
        bookingId: bookingIdStr,
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

    if (booking.userId.toString() !== userId) {
      throw new Error('Unauthorized: You cannot view this booking');
    }

    return booking;
  }
}