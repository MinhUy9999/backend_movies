import express, { Router } from "express";
import { ShowtimeController } from "../controllers/showtime.controller";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";

const showtimeRoutes: Router = express.Router();

// Public routes
showtimeRoutes.get("/", ShowtimeController.getAllShowtimes);
showtimeRoutes.get("/:id", ShowtimeController.getShowtimeById);
showtimeRoutes.get("/movie/:movieId", ShowtimeController.getShowtimesByMovie);
showtimeRoutes.get("/theater/:theaterId", ShowtimeController.getShowtimesByTheater);
showtimeRoutes.get("/:id/seats", ShowtimeController.getShowtimeSeats);

// Admin routes - require authentication and admin role
showtimeRoutes.post("/", authenticateToken, authorizeRoles("admin"), ShowtimeController.createShowtime);
showtimeRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), ShowtimeController.updateShowtime);
showtimeRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), ShowtimeController.deleteShowtime);

export default showtimeRoutes;