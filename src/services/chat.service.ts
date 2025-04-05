import mongoose from 'mongoose';
import { Conversation, IConversation } from '../models/conversation.model';
import { Message, IMessage } from '../models/message.model';
import { User } from '../models/user.model';
import socketService from '../socket/socket.service';

export class ChatService {
  async getOrCreateConversation(userId: string, adminId: string): Promise<IConversation> {
    let conversation = await Conversation.findOne({
      userId,
      adminId
    });

    if (!conversation) {
      const user = await User.findById(userId);
      const admin = await User.findById(adminId);

      if (!user || !admin) {
        throw new Error('User or admin not found');
      }

      if (user.role === 'admin') {
        throw new Error('First user must be a regular user');
      }

      if (admin.role !== 'admin') {
        throw new Error('Second user must be an admin');
      }

      conversation = new Conversation({
        userId,
        adminId,
        unreadUser: 0,
        unreadAdmin: 0,
        isActive: true
      });

      await conversation.save();
    }

    return conversation;
  }

  async sendMessage(conversationId: string, sender: 'user' | 'admin', content: string): Promise<IMessage> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const message = new Message({
        conversationId,
        sender,
        content,
        isRead: false
      });

      await message.save({ session });

      conversation.lastMessage = content;
      conversation.lastMessageTime = new Date();
      
      if (sender === 'user') {
        conversation.unreadAdmin += 1;
      } else {
        conversation.unreadUser += 1;
      }

      await conversation.save({ session });
      await session.commitTransaction();

      if (sender === 'user') {
        socketService.sendToUser(conversation.adminId.toString(), 'new_message', {
          message: this.formatMessage(message),
          conversation: this.formatConversation(conversation)
        });
      } else {
        socketService.sendToUser(conversation.userId.toString(), 'new_message', {
          message: this.formatMessage(message),
          conversation: this.formatConversation(conversation)
        });
      }

      return message;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async markConversationAsRead(conversationId: string, userRole: 'user' | 'admin'): Promise<void> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const unreadCondition = {
        conversationId,
        sender: userRole === 'user' ? 'admin' : 'user',
        isRead: false
      };

      await Message.updateMany(unreadCondition, { isRead: true }, { session });

      if (userRole === 'user') {
        conversation.unreadUser = 0;
      } else {
        conversation.unreadAdmin = 0;
      }

      await conversation.save({ session });
      await session.commitTransaction();

      const notifyUserId = userRole === 'user' ? conversation.adminId.toString() : conversation.userId.toString();
      socketService.sendToUser(notifyUserId, 'conversation_read', {
        conversationId,
        reader: userRole
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getMessages(conversationId: string, limit: number = 50, before?: Date): Promise<IMessage[]> {
    const query: any = { conversationId };
    
    if (before) {
      query.createdAt = { $lt: before };
    }

    return await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getConversations(userId: string, isAdmin: boolean): Promise<IConversation[]> {
    const query = isAdmin ? { adminId: userId } : { userId };
    
    return await Conversation.find(query)
      .sort({ lastMessageTime: -1 })
      .populate('userId', 'username avatar')
      .populate('adminId', 'username avatar')
      .lean();
  }

  async getAvailableAdmins(): Promise<any[]> {
    return await User.find({ role: 'admin', isActive: true })
      .select('username avatar')
      .lean();
  }

  private formatMessage(message: IMessage): any {
    return {
      id: message._id,
      conversationId: message.conversationId,
      sender: message.sender,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt
    };
  }

  private formatConversation(conversation: IConversation): any {
    return {
      id: conversation._id,
      userId: conversation.userId,
      adminId: conversation.adminId,
      lastMessage: conversation.lastMessage,
      lastMessageTime: conversation.lastMessageTime,
      unreadUser: conversation.unreadUser,
      unreadAdmin: conversation.unreadAdmin
    };
  }
}

export default new ChatService();