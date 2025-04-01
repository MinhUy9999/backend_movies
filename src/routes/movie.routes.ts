import express, { Router } from "express";
import { MovieController, uploadMovieFiles } from "../controllers/movie.controller";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";

const movieRoutes: Router = express.Router();

// Public routes
movieRoutes.get("/", MovieController.getActiveMovies);
movieRoutes.get("/search", MovieController.searchMovies);
movieRoutes.get("/upcoming", MovieController.getUpcomingMovies);
movieRoutes.get("/genre/:genre", MovieController.getMoviesByGenre);
movieRoutes.get("/:id", MovieController.getMovieById);
movieRoutes.get("/:id/showtimes", MovieController.getMovieShowtimes);

// Admin routes - require authentication and admin role
movieRoutes.post("/", authenticateToken, authorizeRoles("admin"), uploadMovieFiles, MovieController.createMovie);
movieRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), uploadMovieFiles, MovieController.updateMovie);
movieRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), MovieController.deleteMovie);
movieRoutes.get("/all/include-inactive", authenticateToken, authorizeRoles("admin"), MovieController.getAllMovies);

export default movieRoutes;