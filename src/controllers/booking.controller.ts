import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { BookingService } from "../services/booking.service";
import { PaymentProcessor, CreditCardPayment, PayPalPayment } from "../patterns/strategy/PaymentStrategy";
import { responseSend } from "../config/response"; // Import hàm responseSend

// Interface to extend Request with user info
interface AuthRequest extends Request {
  user?: any;
}

const bookingService = new BookingService();

export class BookingController {
  static async createBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const { showtimeId, seatIds, paymentMethod } = req.body;

      // Validate input
      if (!showtimeId || !seatIds || !seatIds.length || !paymentMethod) {
        responseSend(
          res,
          null,
          "Missing required booking information",
          HTTP_STATUS_CODES.BAD_REQUEST
        );
        return;
      }

      // Create booking
      const booking = await bookingService.createBooking({
        userId: req.user.id,
        showtimeId,
        seatIds,
        paymentMethod,
        paymentDetails: {}, // Will be provided at payment processing step
      });

      responseSend(
        res,
        { booking },
        "Booking created successfully",
        HTTP_STATUS_CODES.CREATED
      );
    } catch (error: any) {
      console.error("Error creating booking:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error creating booking",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async processPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const { bookingId, paymentMethod, paymentDetails } = req.body;

      // Validate input
      if (!bookingId || !paymentMethod || !paymentDetails) {
        responseSend(
          res,
          null,
          "Missing required payment information",
          HTTP_STATUS_CODES.BAD_REQUEST
        );
        return;
      }

      // Select payment strategy based on payment method
      let paymentStrategy;
      switch (paymentMethod.toLowerCase()) {
        case "credit_card":
          paymentStrategy = new CreditCardPayment();
          break;
        case "paypal":
          paymentStrategy = new PayPalPayment();
          break;
        default:
          responseSend(
            res,
            null,
            "Unsupported payment method",
            HTTP_STATUS_CODES.BAD_REQUEST
          );
          return;
      }

      // Create payment processor with selected strategy
      const paymentProcessor = new PaymentProcessor(paymentStrategy);

      // Process payment
      const updatedBooking = await bookingService.processPayment(
        bookingId,
        paymentProcessor,
        paymentDetails
      );

      responseSend(
        res,
        { booking: updatedBooking },
        "Payment processed successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error processing payment:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error processing payment",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const { id } = req.params;

      // Cancel booking
      const booking = await bookingService.cancelBooking(id, req.user.id);

      responseSend(
        res,
        { booking },
        "Booking cancelled successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error cancelling booking:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error cancelling booking",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async getUserBookings(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      // Get user bookings
      const bookings = await bookingService.getUserBookings(req.user.id);

      responseSend(
        res,
        { bookings },
        "User bookings fetched successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error fetching user bookings:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching user bookings",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getBookingDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const { id } = req.params;

      // Get booking details
      const booking = await bookingService.getBookingDetails(id, req.user.id);

      responseSend(
        res,
        { booking },
        "Booking details fetched successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error fetching booking details:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching booking details",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
}