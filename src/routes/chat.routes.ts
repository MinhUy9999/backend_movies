// src/routes/chat.routes.ts
import express, { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const chatRoutes: Router = express.Router();

chatRoutes.use(authenticateToken);

chatRoutes.get("/conversations", ChatController.getConversations);

chatRoutes.get("/conversations/:conversationId/messages", ChatController.getMessages);

chatRoutes.post("/conversations", ChatController.createConversation);

chatRoutes.get("/socket-token", ChatController.getSocketToken);

chatRoutes.get("/available-admins", ChatController.getAvailableAdmins);

export default chatRoutes;