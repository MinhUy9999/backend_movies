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
  
      const { targetId } = req.params; 
      const isAdminToAdmin = req.query.type === 'admin-admin';
      
      if (isAdminToAdmin) {
        if (req.user.role !== 'admin') {
          responseSend(
            res, 
            null, 
            "Only admins can create admin-to-admin chats", 
            HTTP_STATUS_CODES.FORBIDDEN
          );
          return;
        }
        
        const conversation = await chatService.getOrCreateAdminChat(req.user.id, targetId);
        responseSend(
          res, 
          { conversation }, 
          "Admin conversation retrieved successfully", 
          HTTP_STATUS_CODES.OK
        );
        return;
      }
      
      // Regular user-admin chat
      if (req.user.role === 'admin') {
        // Admin creating a chat with a user
        const conversation = await chatService.getOrCreateConversation(targetId, req.user.id);
        responseSend(
          res, 
          { conversation }, 
          "Conversation retrieved successfully", 
          HTTP_STATUS_CODES.OK
        );
        return;
      }
  
      // User creating a chat with an admin
      const conversation = await chatService.getOrCreateConversation(req.user.id, targetId);
      
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
  
      const type = req.query.type as 'user-admin' | 'admin-admin' | undefined;
      const isAdmin = req.user.role === 'admin';
      
      if (isAdmin && type) {
        const conversations = await chatService.getFilteredConversations(req.user.id, type);
        responseSend(
          res, 
          { conversations }, 
          `${type} conversations retrieved successfully`, 
          HTTP_STATUS_CODES.OK
        );
        return;
      }
      
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
      
      const senderId = req.user.role === 'admin' ? req.user.id : undefined;
      
      const message = await chatService.sendMessage(
        conversationId, 
        sender, 
        content,
        senderId  
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
      
      await chatService.markConversationAsRead(conversationId, userRole, req.user.id);
      
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
    try {
      if (!req.user) {
        responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      }
      
      const admins = await chatService.getAvailableAdmins();
      
      const filteredAdmins = req.user.role === 'admin'
        ? admins.filter(admin => admin._id.toString() !== req.user.id)
        : admins;
      
      responseSend(
        res, 
        { admins: filteredAdmins }, 
        "Available admins retrieved successfully", 
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error getting available admins:", error.message);
      responseSend(
        res, 
        null, 
        error.message || "Error getting available admins", 
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
}