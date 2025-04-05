import { Request, Response } from 'express';
import { HTTP_STATUS_CODES } from '../httpStatus/httpStatusCode';
import { responseSend } from '../config/response';
import chatService from '../services/chat.service';

interface AuthRequest extends Request {
  user?: any;
}

export class ChatController {
  static async getOrCreateConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
  
      const { adminId } = req.params;
      
      if (req.user.role === 'admin') {
        const conversation = await chatService.getOrCreateConversation(adminId, req.user.id);
        responseSend(
          res, 
          { conversation }, 
          "Conversation retrieved successfully", 
          HTTP_STATUS_CODES.OK
        );
        return;
      }
  
      const conversation = await chatService.getOrCreateConversation(req.user.id, adminId);
      
      responseSend(
        res, 
        { conversation }, 
        "Conversation retrieved successfully", 
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error getting conversation:", error.message);
      responseSend(
        res, 
        null, 
        error.message || "Error getting conversation", 
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const isAdmin = req.user.role === 'admin';
      const conversations = await chatService.getConversations(req.user.id, isAdmin);
      
      responseSend(
        res, 
        { conversations }, 
        "Conversations retrieved successfully", 
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error getting conversations:", error.message);
      responseSend(
        res, 
        null, 
        error.message || "Error getting conversations", 
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const { conversationId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const before = req.query.before ? new Date(req.query.before as string) : undefined;
      
      const messages = await chatService.getMessages(conversationId, limit, before);
      
      responseSend(
        res, 
        { messages }, 
        "Messages retrieved successfully", 
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error getting messages:", error.message);
      responseSend(
        res, 
        null, 
        error.message || "Error getting messages", 
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
  
      const { conversationId, content } = req.body;
      
      if (!conversationId || !content) {
        responseSend(
          res, 
          null, 
          "Conversation ID and content are required", 
          HTTP_STATUS_CODES.BAD_REQUEST
        );
        return;
      }
      
      const sender = req.user.role === 'admin' ? 'admin' : 'user';
      
      const message = await chatService.sendMessage(
        conversationId, 
        sender, 
        content
      );
      
      responseSend(
        res, 
        { message }, 
        "Message sent successfully", 
        HTTP_STATUS_CODES.CREATED
      );
    } catch (error: any) {
      console.error("Error sending message:", error.message);
      responseSend(
        res, 
        null, 
        error.message || "Error sending message", 
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async markConversationAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const { conversationId } = req.params;
      const userRole = req.user.role === 'admin' ? 'admin' : 'user';
      
      await chatService.markConversationAsRead(conversationId, userRole);
      
      responseSend(
        res, 
        null, 
        "Conversation marked as read", 
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error marking conversation as read:", error.message);
      responseSend(
        res, 
        null, 
        error.message || "Error marking conversation as read", 
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getAvailableAdmins(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
      return;
    }
  
    if (req.user.role !== 'user') {
      responseSend(
        res, 
        { admins: [] }, 
        "Only users can access admin list", 
        HTTP_STATUS_CODES.BAD_REQUEST
      );
      return;
    }
    
    const admins = await chatService.getAvailableAdmins();
    
    responseSend(
      res, 
      { admins }, 
      "Available admins retrieved successfully", 
      HTTP_STATUS_CODES.OK
    );
  }
}