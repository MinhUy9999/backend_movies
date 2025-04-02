import express, { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const bookingRoutes: Router = express.Router();

// All booking routes require authentication
bookingRoutes.use(authenticateToken);

// User booking routes
bookingRoutes.post("/", authenticateToken, BookingController.createBooking);
bookingRoutes.post("/payment", authenticateToken, BookingController.processPayment);
bookingRoutes.delete("/:id", authenticateToken, BookingController.cancelBooking);
bookingRoutes.get("/", authenticateToken, BookingController.getUserBookings);
bookingRoutes.get("/:id", authenticateToken, BookingController.getBookingDetails);

export default bookingRoutes;