import express from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";
import { UserController } from "../controllers/user.controller";

const adminRoutes = express.Router();

adminRoutes.get("/users", authenticateToken, authorizeRoles("admin"), UserController.getAllUsers);

export default adminRoutes;