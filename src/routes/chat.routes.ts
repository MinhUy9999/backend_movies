import express, { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const chatRoutes: Router = express.Router();

chatRoutes.use(authenticateToken);

chatRoutes.get("/conversations", ChatController.getConversations);

chatRoutes.get("/conversation/:adminId", ChatController.getOrCreateConversation);

chatRoutes.get("/messages/:conversationId", ChatController.getMessages);

chatRoutes.post("/message", ChatController.sendMessage);

chatRoutes.put("/conversation/:conversationId/read", ChatController.markConversationAsRead);

chatRoutes.get("/admins", ChatController.getAvailableAdmins);

export default chatRoutes;