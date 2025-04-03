import express, { Router } from "express";
import { MessageController } from "../controllers/message.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { UserController } from "../controllers/user.controller";

const messageRoutes: Router = express.Router();

messageRoutes.use(authenticateToken);

messageRoutes.get("/conversations", MessageController.getUserConversations);

messageRoutes.get("/available-admins", MessageController.getAvailableAdmins);

messageRoutes.get("/conversation/:otherUserId", MessageController.getConversation);

messageRoutes.post("/", MessageController.sendMessage);

messageRoutes.put("/:messageId/read", MessageController.markAsRead);

messageRoutes.delete("/:messageId", MessageController.deleteMessage);

export default messageRoutes;