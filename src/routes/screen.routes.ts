import express, { Router } from "express";
import { ScreenController } from "../controllers/screen.controller";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";

const screenRoutes: Router = express.Router();

// Public screen routes
screenRoutes.get("/", ScreenController.getAllScreens);
screenRoutes.get("/:id", ScreenController.getScreenById);
screenRoutes.get("/:id/seats", ScreenController.getScreenSeats);

// Admin screen routes - require authentication and admin role
screenRoutes.post("/", authenticateToken, authorizeRoles("admin"), ScreenController.createScreen);
screenRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), ScreenController.updateScreen);
screenRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), ScreenController.deleteScreen);
screenRoutes.put("/:id/seats", authenticateToken, authorizeRoles("admin"), ScreenController.updateScreenSeats);

export default screenRoutes;