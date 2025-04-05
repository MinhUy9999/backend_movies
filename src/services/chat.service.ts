// src/services/chat.service.ts
import { Conversation, IConversation } from '../models/conversation.model';
import { Message, IMessage } from '../models/message.model';
import { User } from '../models/user.model';
import mongoose from 'mongoose';

export class ChatService {
  async getOrCreateConversation(userId: string, receiverId: string): Promise<IConversation> {
    try {
      // Kiểm tra vai trò
      const sender = await User.findById(userId);
      const receiver = await User.findById(receiverId);
      
      if (!sender || !receiver) {
        throw new Error('User not found');
      }
      
      let adminId, regularUserId;
      
      if (sender.role === 'admin' && receiver.role === 'user') {
        adminId = userId;
        regularUserId = receiverId;
      } else if (sender.role === 'user' && receiver.role === 'admin') {
        adminId = receiverId;
        regularUserId = userId;
      } else {
        throw new Error('Conversations can only be between admin and user');
      }
      
      // Tìm conversation hiện có
      let conversation = await Conversation.findOne({
        userId: regularUserId,
        adminId: adminId
      });
      
      // Nếu không tìm thấy, tạo mới
      if (!conversation) {
        conversation = new Conversation({
          userId: regularUserId,
          adminId: adminId
        });
        await conversation.save();
      }
      
      return conversation;
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  }
  
  async sendMessage(conversationId: string, senderId: string, content: string): Promise<IMessage> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      const sender = await User.findById(senderId);
      if (!sender) {
        throw new Error('Sender not found');
      }
      
      // Kiểm tra người gửi có phải là người tham gia cuộc trò chuyện
      const isParticipant = 
        (conversation.userId.toString() === senderId) || 
        (conversation.adminId.toString() === senderId);
        
      if (!isParticipant) {
        throw new Error('Sender is not a participant in this conversation');
      }
      
      // Xác định sender type
      const senderType = sender.role === 'admin' ? 'admin' : 'user';
      
      const message = new Message({
        conversationId,
        senderId,
        sender: senderType,
        content,
        isRead: false
      });
      
      await message.save();
      
      if (message._id) {
        conversation.lastMessage = message._id as mongoose.Types.ObjectId;
        conversation.updatedAt = new Date();
        await conversation.save();
      }
      
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username avatar');
        
      return populatedMessage!;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }
  
  async getConversations(userId: string): Promise<any[]> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      let query: any = {};
      
      if (user.role === 'admin') {
        query = { adminId: userId };
      } else {
        query = { userId: userId };
      }
      
      const conversations = await Conversation.find(query)
        .populate('userId', 'username avatar')
        .populate('adminId', 'username avatar')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });
      
      // Thêm unread count
      const result = await Promise.all(conversations.map(async (conv) => {
        const isAdmin = user.role === 'admin';
        
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userId },
          isRead: false
        });
        
        const otherUser = isAdmin ? conv.userId : conv.adminId;
        
        return {
          _id: conv._id,
          otherUser,
          lastMessage: conv.lastMessage,
          unreadCount,
          updatedAt: conv.updatedAt
        };
      }));
      
      return result;
    } catch (error) {
      console.error('Error in getConversations:', error);
      throw error;
    }
  }
  
  async getMessages(conversationId: string, options: { limit: number, page: number } = { limit: 20, page: 1 }): Promise<any> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      const { limit, page } = options;
      const skip = (page - 1) * limit;
      
      const totalCount = await Message.countDocuments({ conversationId });
      const totalPages = Math.ceil(totalCount / limit);
      
      const messages = await Message.find({ conversationId })
        .populate('senderId', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return {
        messages: messages.reverse(),
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit
        }
      };
    } catch (error) {
      console.error('Error in getMessages:', error);
      throw error;
    }
  }
  
  async markAsRead(messageId: string, readerId: string): Promise<any> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Chỉ người nhận mới có thể đánh dấu đã đọc
      if (message.senderId.toString() === readerId) {
        return { success: false, error: 'Cannot mark your own message as read' };
      }
      
      // Đánh dấu đã đọc
      message.isRead = true;
      await message.save();
      
      return { 
        success: true, 
        messageId,
        senderId: message.senderId.toString()
      };
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }
  
  async isUserInConversation(userId: string, conversationId: string): Promise<boolean> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return false;
      
      return (
        conversation.userId.toString() === userId ||
        conversation.adminId.toString() === userId
      );
    } catch (error) {
      console.error('Error in isUserInConversation:', error);
      return false;
    }
  }
  
  async markAllAsRead(conversationId: string, readerId: string): Promise<{ success: boolean, count: number }> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Kiểm tra người đọc có trong cuộc trò chuyện
      const isParticipant = 
        (conversation.userId.toString() === readerId) || 
        (conversation.adminId.toString() === readerId);
        
      if (!isParticipant) {
        throw new Error('Reader is not a participant in this conversation');
      }
      
      // Đánh dấu đọc tất cả tin nhắn của người khác
      const result = await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: readerId },
          isRead: false
        },
        { isRead: true }
      );
      
      return { success: true, count: result.modifiedCount };
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw error;
    }
  }
  
  async getConversation(conversationId: string): Promise<IConversation | null> {
    return await Conversation.findById(conversationId)
      .populate('userId', 'username avatar')
      .populate('adminId', 'username avatar');
  }
  
  async getAdmins(): Promise<any[]> {
    try {
      return await User.find({ role: 'admin' }, 'username avatar');
    } catch (error) {
      console.error('Error in getAdmins:', error);
      throw error;
    }
  }
}