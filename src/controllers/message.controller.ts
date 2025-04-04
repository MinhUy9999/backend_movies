// src/controllers/message.controller.ts
import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { MessageService } from "../services/message.service";
import { responseSend } from "../config/response";
import webSocketManager from "../patterns/singleton/WebSocketManager";

// Interface to extend Request with user info
interface AuthRequest extends Request {
  user?: any;
}

const messageService = new MessageService();

export class MessageController {
  static async getConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const { otherUserId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      console.log("Getting conversation between", req.user.id, "and", otherUserId);
      console.log("User role:", req.user.role);
      
      let userId = req.user.role === "admin" ? otherUserId : req.user.id;
      let adminId = req.user.role === "admin" ? req.user.id : otherUserId;
      
      console.log("Using userId:", userId, "and adminId:", adminId);
      
      const messages = await messageService.getConversation(userId, adminId, limit);
      
      responseSend(res, { messages }, "Conversation fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching conversation:", error.message);
      responseSend(res, null, error.message || "Error fetching conversation", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async getUserConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const conversations = await messageService.getUserConversations(req.user.id);
      
      responseSend(res, { conversations }, "Conversations fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching conversations:", error.message);
      responseSend(res, null, error.message || "Error fetching conversations", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const { receiverId, content } = req.body;
      
      if (!receiverId || !content) {
        responseSend(res, null, "Receiver ID and content are required", HTTP_STATUS_CODES.BAD_REQUEST);
        return;
      }
      
      const message = await messageService.sendMessage(req.user.id, receiverId, content);
      
      webSocketManager.sendToUser(receiverId, {
        type: 'new_message',
        message: {
          _id: message._id,
          sender: message.sender,
          content: message.content,
          createdAt: message.createdAt,
          userId: message.userId,
          adminId: message.adminId,
          isRead: message.isRead
        }
      });

      webSocketManager.sendToUser(req.user.id, {
        type: 'new_message',
        message: {
          _id: message._id,
          sender: message.sender,
          content: message.content,
          createdAt: message.createdAt,
          userId: message.userId,
          adminId: message.adminId,
          isRead: message.isRead
        }
      });
      
      responseSend(res, { message }, "Message sent successfully", HTTP_STATUS_CODES.CREATED);
    } catch (error: any) {
      console.error("Error sending message:", error.message);
      responseSend(res, null, error.message || "Error sending message", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const { messageId } = req.params;
      
      const message = await messageService.markAsRead(messageId, req.user.id);
      
      if (!message) {
        responseSend(res, null, "Message not found or you don't have permission", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }
      
      webSocketManager.sendToUser(message.sender.toString(), {
        type: 'message_read',
        messageId
      });
      
      responseSend(res, { message }, "Message marked as read", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error marking message as read:", error.message);
      responseSend(res, null, error.message || "Error marking message as read", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
  
  static async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const { messageId } = req.params;
      
      const success = await messageService.deleteMessage(messageId, req.user.id);
      
      if (!success) {
        responseSend(res, null, "Message not found or you don't have permission", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }
      
      responseSend(res, null, "Message deleted successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error deleting message:", error.message);
      responseSend(res, null, error.message || "Error deleting message", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async getAvailableAdmins(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const isAdmin = await messageService.isUserAdmin(req.user.id);
      if (isAdmin) {
        responseSend(
          res, 
          { admins: [] }, 
          "Admin users cannot chat with other admins", 
          HTTP_STATUS_CODES.BAD_REQUEST
        );
        return;
      }
      
      const admins = await messageService.getAllAdmins();
      
      responseSend(res, { admins }, "Available admins fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching available admins:", error.message);
      responseSend(res, null, error.message || "Error fetching available admins", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
}