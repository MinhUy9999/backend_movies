import express, { Router } from "express";
import { TheaterController } from "../controllers/theater.controller";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";

const theaterRoutes: Router = express.Router();

// Public theater routes
theaterRoutes.get("/", TheaterController.getAllTheaters);
theaterRoutes.get("/:id", TheaterController.getTheaterById);
theaterRoutes.get("/:id/screens", TheaterController.getTheaterScreens);

// Admin theater routes - require authentication and admin role
theaterRoutes.post("/", authenticateToken, authorizeRoles("admin"), TheaterController.createTheater);
theaterRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), TheaterController.updateTheater);
theaterRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), TheaterController.deleteTheater);

export default theaterRoutes;