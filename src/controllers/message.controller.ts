import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { MessageService } from "../services/message.service";
import { responseSend } from "../config/response";
import socketService from "../socket/socket.service";

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
      
      let userId = req.user.role === "admin" ? otherUserId : req.user.id;
      let adminId = req.user.role === "admin" ? req.user.id : otherUserId;
      
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
      
      // Lấy các ID từ message đúng với cấu trúc IMessage
      let userId, adminId;
      if (message.sender === 'user') {
        userId = message.conversationId ? message.conversationId.toString() : "";
        adminId = receiverId;
      } else {
        adminId = message.conversationId ? message.conversationId.toString() : "";
        userId = receiverId;
      }
      
      const messageForSocket = {
        _id: message._id ? message._id.toString() : "",
        sender: message.sender || "",
        content: message.content || "",
        createdAt: message.createdAt || new Date(),
        userId: userId,
        adminId: adminId,
        isRead: message.isRead || false
      };
      
      // Determine receiver ID based on sender role
      const receiverIdStr = message.sender === 'admin' ? userId : adminId;
      
      // Send to receiver
      socketService.sendToUser(receiverIdStr, 'new_message', {
        message: messageForSocket
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
      
      // Lấy id người nhận thông báo từ message service
      const notifyUserId = await messageService.getRecipientId(message, req.user.id);
      
      if (notifyUserId) {
        socketService.sendToUser(notifyUserId, 'message_read', {
          messageId
        });
      }
      
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