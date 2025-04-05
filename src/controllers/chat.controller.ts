// src/controllers/chat.controller.ts
import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { ChatService } from "../services/chat.service";
import { responseSend } from "../config/response";
import { generateWebSocketToken } from "../utils/jwt";

interface AuthRequest extends Request {
  user?: any;
}

const chatService = new ChatService();

export class ChatController {
  static async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const conversations = await chatService.getConversations(req.user.id);
      
      responseSend(res, { conversations }, "Conversations fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching conversations:", error.message);
      responseSend(res, null, error.message || "Error fetching conversations", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const { conversationId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      
      // Kiểm tra người dùng có quyền truy cập cuộc trò chuyện
      const isInConversation = await chatService.isUserInConversation(req.user.id, conversationId);
      
      if (!isInConversation && req.user.role !== 'admin') {
        responseSend(res, null, "Access denied to this conversation", HTTP_STATUS_CODES.FORBIDDEN);
        return;
      }
      
      const result = await chatService.getMessages(conversationId, { limit, page });
      
      responseSend(res, result, "Messages fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching messages:", error.message);
      responseSend(res, null, error.message || "Error fetching messages", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const { otherUserId } = req.body;
      
      if (!otherUserId) {
        responseSend(res, null, "Other user ID is required", HTTP_STATUS_CODES.BAD_REQUEST);
        return;
      }
      
      const conversation = await chatService.getOrCreateConversation(req.user.id, otherUserId);
      
      responseSend(res, { conversation }, "Conversation created successfully", HTTP_STATUS_CODES.CREATED);
    } catch (error: any) {
      console.error("Error creating conversation:", error.message);
      responseSend(res, null, error.message || "Error creating conversation", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async getSocketToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const token = generateWebSocketToken({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      });
      
      responseSend(res, { token }, "Socket token generated successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error generating socket token:", error.message);
      responseSend(res, null, error.message || "Error generating socket token", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async getAvailableAdmins(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      if (req.user.role === 'admin') {
        responseSend(
          res, 
          { admins: [] }, 
          "Admin users cannot chat with other admins", 
          HTTP_STATUS_CODES.BAD_REQUEST
        );
        return;
      }
      
      const admins = await chatService.getAdmins();
      
      responseSend(res, { admins }, "Available admins fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching available admins:", error.message);
      responseSend(res, null, error.message || "Error fetching available admins", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
}