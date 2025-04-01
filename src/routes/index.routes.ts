import { Router } from "express";
import userRoutes from "./user.routes";
import adminRoutes from "./admin.routes";
import movieRoutes from "./movie.routes";
import showtimeRoutes from "./showtime.routes";
import bookingRoutes from "./booking.routes";
import theaterRoutes from "./theater.routes";
import screenRoutes from "./screen.routes";
import seatRoutes from "./seat.routes";

const router = Router();

router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/movies", movieRoutes);
router.use("/seats", seatRoutes)
router.use("/showtimes", showtimeRoutes);
router.use("/bookings", bookingRoutes);
router.use("/theaters", theaterRoutes);
router.use("/screens", screenRoutes);

export default router;
