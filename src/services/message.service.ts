import { Message, IMessage } from "../models/message.model";
import { User } from "../models/user.model";
import { Conversation, IConversation  } from "../models/conversation.model";
import mongoose from "mongoose";

interface UserConversation {
  user: any;
  lastMessage: any;
  unreadCount: number;
  type: 'user';
}

interface AdminConversation {
  admin: any;
  lastMessage: any;
  unreadCount: number;
  type: 'admin';
}

type Conversation = UserConversation | AdminConversation;

export class MessageService {
  async getConversation(userId: string, adminId: string, limit: number = 50): Promise<IMessage[]> {
    try {
      const messages = await Message.find({
        userId: userId,
        adminId: adminId
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username avatar')
      .populate('adminId', 'username avatar');
      
      const userIsAdmin = await this.isUserAdmin(userId);
      
      if (userIsAdmin) {
        await Message.updateMany(
          { userId, adminId, sender: "user", isRead: false },
          { isRead: true }
        );
      } else {
        await Message.updateMany(
          { userId, adminId, sender: "admin", isRead: false },
          { isRead: true }
        );
      }
      
      return messages.reverse();
    } catch (error: any) {
      throw new Error(`Error fetching conversation: ${error.message}`);
    }
  }
  
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      return user?.role === "admin";
    } catch (error) {
      return false;
    }
  }
  
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const isAdmin = await this.isUserAdmin(userId);
      let conversations: Conversation[] = [];
      
      if (isAdmin) {
        const uniqueUserIds = await Message.find({
          adminId: userId
        }).distinct('userId');
        
        for (const uid of uniqueUserIds) {
          const user = await User.findById(uid, 'username avatar');
          const lastMessage = await Message.findOne({
            userId: uid,
            adminId: userId
          }).sort({ createdAt: -1 });
          
          const unreadCount = await Message.countDocuments({
            userId: uid,
            adminId: userId,
            sender: "user",
            isRead: false
          });
          
          if (user && lastMessage) {
            conversations.push({
              user,
              lastMessage,
              unreadCount,
              type: 'user'
            });
          }
        }
      } else {
        const uniqueAdminIds = await Message.find({
          userId: userId
        }).distinct('adminId');
        
        if (uniqueAdminIds.length === 0) {
          const allAdmins = await User.find({ role: "admin" }, 'username avatar');
          conversations = allAdmins.map(admin => ({
            admin,
            lastMessage: null,
            unreadCount: 0,
            type: 'admin' as const
          }));
        } else {
          for (const adminId of uniqueAdminIds) {
            const admin = await User.findById(adminId, 'username avatar');
            const lastMessage = await Message.findOne({
              userId: userId,
              adminId: adminId
            }).sort({ createdAt: -1 });
            
            const unreadCount = await Message.countDocuments({
              userId: userId,
              adminId: adminId,
              sender: "admin",
              isRead: false
            });
            
            if (admin && lastMessage) {
              conversations.push({
                admin,
                lastMessage,
                unreadCount,
                type: 'admin'
              });
            }
          }
        }
      }
      
      return conversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) {
          if (a.type === 'user' && b.type === 'user') {
            return a.user.username.localeCompare(b.user.username);
          } else if (a.type === 'admin' && b.type === 'admin') {
            return a.admin.username.localeCompare(b.admin.username);
          } else {
            return 0;
          }
        }
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime();
      });
    } catch (error: any) {
      throw new Error(`Error fetching conversations: ${error.message}`);
    }
  }
  
  async sendMessage(senderId: string, receiverId: string, content: string): Promise<IMessage> {
    try {
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
      
      if (!sender || !receiver) {
        throw new Error('Sender or receiver not found');
      }
      
      const senderIsAdmin = sender.role === "admin";
      const receiverIsAdmin = receiver.role === "admin";
      
      if (!senderIsAdmin && !receiverIsAdmin) {
        throw new Error('One participant must be an admin');
      }
      
      let userId, adminId, senderRole;
      
      if (senderIsAdmin) {
        adminId = senderId;
        userId = receiverId;
        senderRole = "admin";
      } else {
        userId = senderId;
        adminId = receiverId;
        senderRole = "user";
      }
      
      const newMessage = new Message({
        userId,
        adminId,
        sender: senderRole,
        content,
        isRead: false
      });
      
      return await newMessage.save();
    } catch (error: any) {
      throw new Error(`Error sending message: ${error.message}`);
    }
  }
  
  async markAsRead(messageId: string, readerId: string): Promise<IMessage | null> {
    try {
      const message = await Message.findById(messageId);
      if (!message) return null;
      
      const readerIsAdmin = await this.isUserAdmin(readerId);
      
      if ((readerIsAdmin && message.sender === "user") || 
          (!readerIsAdmin && message.sender === "admin")) {
        
        message.isRead = true;
        await message.save();
        return message;
      }
      
      return null;
    } catch (error: any) {
      throw new Error(`Error marking message as read: ${error.message}`);
    }
  }
  
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await Message.findById(messageId);
      if (!message) return false;
      
      const isAdmin = await this.isUserAdmin(userId);
      
      if ((isAdmin && message.sender === "admin" && message.adminId.toString() === userId) ||
          (!isAdmin && message.sender === "user" && message.userId.toString() === userId)) {
        
        await Message.deleteOne({ _id: messageId });
        return true;
      }
      
      return false;
    } catch (error: any) {
      throw new Error(`Error deleting message: ${error.message}`);
    }
  }
  
  async getAllAdmins(): Promise<any[]> {
    return await User.find({ role: "admin" }, 'username avatar');
  }

  async getRecipientId(message: IMessage, currentUserId: string): Promise<string | null> {
    try {
      const messageId = message._id as mongoose.Types.ObjectId | string;
      
      if (message.sender === "user") {
        return message.adminId.toString();
      } else {
        return message.userId.toString();
      }
    } catch (error) {
      console.error('Error getting recipient ID:', error);
      return null;
    }
  }
}