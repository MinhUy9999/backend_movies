import mongoose from 'mongoose';
import { Conversation, IConversation } from '../models/conversation.model';
import { Message, IMessage } from '../models/message.model';
import { User } from '../models/user.model';
import socketService from '../socket/socket.service';

export class ChatService {
  async getOrCreateConversation(userId: string, adminId: string, isAdminToAdmin: boolean = false): Promise<IConversation> {
    const type = isAdminToAdmin ? "admin-admin" : "user-admin";
    
    let conversation = await Conversation.findOne({
      userId,
      adminId,
      type
    });
  
    if (!conversation) {
      const user = await User.findById(userId);
      const admin = await User.findById(adminId);
  
      if (!user || !admin) {
        throw new Error('User or admin not found');
      }
  
      if (isAdminToAdmin) {
        if (user.role !== 'admin' || admin.role !== 'admin') {
          throw new Error('Both users must be admins for admin-to-admin chat');
        }
      } else {
        if (user.role === 'admin') {
          throw new Error('First user must be a regular user');
        }
  
        if (admin.role !== 'admin') {
          throw new Error('Second user must be an admin');
        }
      }
  
      conversation = new Conversation({
        userId,
        adminId,
        type,
        unreadUser: 0,
        unreadAdmin: 0,
        unreadInitiator: 0,
        unreadReceiver: 0,
        isActive: true
      });
  
      await conversation.save();
    }
  
    return conversation;
  }

  async getOrCreateAdminChat(initiatorId: string, receiverId: string): Promise<IConversation> {
    return this.getOrCreateConversation(initiatorId, receiverId, true);
  }

  async sendMessage(conversationId: string, sender: 'user' | 'admin', content: string, senderId?: string): Promise<IMessage> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
  
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const messageData: any = {
        conversationId,
        userId: conversation.userId,    
        adminId: conversation.adminId, 
        sender,
        content,
        isRead: false
      };
  
      if (conversation.type === 'admin-admin' && senderId) {
        messageData.senderId = senderId;
      }
  
      const message = new Message(messageData);
      await message.save({ session });
  
      conversation.lastMessage = content;
      conversation.lastMessageTime = new Date();
      
      if (conversation.type === 'user-admin') {
        if (sender === 'user') {
          conversation.unreadAdmin = (conversation.unreadAdmin || 0) + 1;
        } else {
          conversation.unreadUser = (conversation.unreadUser || 0) + 1;
        }
      } else {
        const isInitiator = senderId === conversation.userId.toString();
        
        if (conversation.unreadInitiator === undefined) {
          conversation.unreadInitiator = 0;
        }
        
        if (conversation.unreadReceiver === undefined) {
          conversation.unreadReceiver = 0;
        }
        
        if (isInitiator) {
          conversation.unreadReceiver += 1;
        } else {
          conversation.unreadInitiator += 1;
        }
      }
  
      await conversation.save({ session });
      await session.commitTransaction();
  
      if (conversation.type === 'user-admin') {
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
      } else {
        const recipientId = senderId === conversation.userId.toString() 
          ? conversation.adminId.toString() 
          : conversation.userId.toString();
        
        socketService.sendToUser(recipientId, 'new_message', {
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

  async markConversationAsRead(conversationId: string, userRole: 'user' | 'admin', userId?: string): Promise<void> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
  
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      if (conversation.type === 'user-admin') {
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
        
        const notifyUserId = userRole === 'user' ? conversation.adminId.toString() : conversation.userId.toString();
        socketService.sendToUser(notifyUserId, 'conversation_read', {
          conversationId,
          reader: userRole
        });
      } else {
        if (!userId) {
          throw new Error('UserId required for admin-admin conversation');
        }
  
        const isInitiator = userId === conversation.userId.toString();
        
        const unreadCondition = {
          conversationId,
          senderId: isInitiator ? conversation.adminId : conversation.userId,
          isRead: false
        };
  
        await Message.updateMany(unreadCondition, { isRead: true }, { session });
  
        if (conversation.unreadInitiator === undefined) {
          conversation.unreadInitiator = 0;
        }
        
        if (conversation.unreadReceiver === undefined) {
          conversation.unreadReceiver = 0;
        }
        
        if (isInitiator) {
          conversation.unreadInitiator = 0;
        } else {
          conversation.unreadReceiver = 0;
        }
  
        await conversation.save({ session });
        
        const notifyUserId = isInitiator ? conversation.adminId.toString() : conversation.userId.toString();
        socketService.sendToUser(notifyUserId, 'conversation_read', {
          conversationId,
          reader: 'admin',
          readerId: userId
        });
      }
  
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getFilteredConversations(userId: string, conversationType?: 'user-admin' | 'admin-admin'): Promise<IConversation[]> {
    let query;
    
    if (conversationType === 'admin-admin') {
      query = {
        type: 'admin-admin',
        $or: [
          { userId: userId },
          { adminId: userId }
        ]
      };
    } else if (conversationType === 'user-admin') {
      query = { 
        type: 'user-admin',
        adminId: userId 
      };
    } else {
      query = {
        $or: [
          { adminId: userId },
          { userId: userId }
        ]
      };
    }
    
    return await Conversation.find(query)
      .sort({ lastMessageTime: -1 })
      .populate('userId', 'username avatar')
      .populate('adminId', 'username avatar')
      .lean();
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
    return await User.find({ 
      role: 'admin', 
    }).select('username avatar').lean();
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