import express, { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const bookingRoutes: Router = express.Router();

// All booking routes require authentication
bookingRoutes.use(authenticateToken);

// User booking routes
bookingRoutes.post("/", BookingController.createBooking);
bookingRoutes.post("/payment", BookingController.processPayment);
bookingRoutes.delete("/:id", BookingController.cancelBooking);
bookingRoutes.get("/", BookingController.getUserBookings);
bookingRoutes.get("/:id", BookingController.getBookingDetails);

export default bookingRoutes;