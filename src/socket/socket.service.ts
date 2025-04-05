import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

export interface SocketUser {
  userId: string;
  socketId: string;
  username?: string;
  role?: string;
}

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(server: HTTPServer): void {
    if (this.io) {
      console.log('Socket.io already initialized');
      return;
    }

    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'https://frontend-movies-xo0l.onrender.com'],
        credentials: true
      }
    });

    this.setupListeners();
    console.log('Socket.io initialized');
  }

  private setupListeners(): void {
    if (!this.io) return;

    this.io.use((socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        const decoded = verifyAccessToken(token as string);
        if (!decoded || typeof decoded !== 'object' || !decoded.id) {
          return next(new Error('Invalid authentication token'));
        }
        
        (socket as any).userId = decoded.id;
        (socket as any).username = decoded.username;
        (socket as any).role = decoded.role;
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;
      const username = (socket as any).username;
      const role = (socket as any).role;
      
      if (!userId) {
        socket.disconnect();
        return;
      }
      
      console.log(`[Socket.io] User connected: ${userId}`);
      
      // Register user
      this.connectedUsers.set(userId, {
        userId,
        socketId: socket.id,
        username,
        role
      });
      
      // Notify user about connection
      socket.emit('connected', {
        message: 'Successfully connected to booking service'
      });
      
      socket.join(`user:${userId}`);
      
      if (role === 'admin') {
        socket.join('admins');
      }
      
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
      
      socket.on('chat_message', async (data) => {
        try {
          this.handleChatMessage(userId, data, socket);
        } catch (error) {
          console.error('Error handling chat message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });
      
      socket.on('message_read', async (data) => {
        try {
          this.handleMessageRead(userId, data);
        } catch (error) {
          console.error('Error handling message read:', error);
        }
      });
      
      socket.on('disconnect', () => {
        console.log(`[Socket.io] User disconnected: ${userId}`);
        this.connectedUsers.delete(userId);
        this.io?.emit('user_status_changed', { 
          userId, 
          status: 'offline',
          onlineUsers: this.getOnlineUserIds()
        });
      });
      
      this.io?.emit('user_status_changed', { 
        userId, 
        status: 'online',
        onlineUsers: this.getOnlineUserIds()
      });

      socket.on('join_conversation', (data) => {
        if (data.conversationId) {
          socket.join(`conversation:${data.conversationId}`);
          socket.emit('joined_conversation', { conversationId: data.conversationId });
        }
      });
      
      socket.on('leave_conversation', (data) => {
        if (data.conversationId) {
          socket.leave(`conversation:${data.conversationId}`);
        }
      });
      
      socket.on('typing', (data) => {
        if (data.conversationId) {
          socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
            conversationId: data.conversationId,
            userId: userId,
            typing: data.typing
          });
        }
      });
    });
  }

  public sendToConversation(conversationId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  public joinConversation(userId: string, conversationId: string): void {
    const client = this.connectedUsers.get(userId);
    if (client && this.io) {
      const socket = this.io.sockets.sockets.get(client.socketId);
      if (socket) {
        socket.join(`conversation:${conversationId}`);
      }
    }
  }

  public getOnlineUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public sendToUser(userId: string, event: string, data: any): boolean {
    if (!this.io) return false;
    
    this.io.to(`user:${userId}`).emit(event, data);
    return true;
  }

  public sendToAll(event: string, data: any, excludeUserId?: string): void {
    if (!this.io) return;
    
    if (excludeUserId) {
      this.io.except(`user:${excludeUserId}`).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  public sendToAllAdmins(event: string, data: any): void {
    if (!this.io) return;
    this.io.to('admins').emit(event, data);
  }

  public notifySeatsUpdated(showtimeId: string): void {
    if (!this.io) return;
    this.io.emit('seats_updated', { showtimeId });
  }

  private bookingTimers: Map<string, Map<string, NodeJS.Timeout[]>> = new Map();

public startBookingTimer(userId: string, bookingId: string, expirationMinutes: number = 15): boolean {
  if (!this.bookingTimers.has(userId)) {
    this.bookingTimers.set(userId, new Map());
  }
  
  this.stopBookingTimer(userId, bookingId);
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
  
  const allTimers: NodeJS.Timeout[] = [];
  
  const countdownMinutes = [10, 5, 2, 1];
  for (const minute of countdownMinutes) {
    if (minute < expirationMinutes) {
      const notifyAt = new Date();
      notifyAt.setMinutes(notifyAt.getMinutes() + expirationMinutes - minute);
      
      const timer = setTimeout(() => {
        this.sendToUser(userId, 'booking_expiring', {
          bookingId,
          minutesLeft: minute
        });
      }, notifyAt.getTime() - Date.now());
      
      allTimers.push(timer);
    }
  }
  
  const expirationTimer = setTimeout(() => {
    this.sendToUser(userId, 'booking_expired', {
      bookingId
    });
    
    this.bookingTimers.get(userId)?.delete(bookingId);
  }, expiresAt.getTime() - Date.now());
  
  allTimers.push(expirationTimer);
  
  this.bookingTimers.get(userId)?.set(bookingId, allTimers);
  
  this.sendToUser(userId, 'booking_reserved', {
    bookingId,
    expiresAt: expiresAt.toISOString()
  });
  
  return true;
}

  public stopBookingTimer(userId: string, bookingId: string): boolean {
    if (!this.bookingTimers.has(userId)) {
      return false;
    }
    
    const userTimers = this.bookingTimers.get(userId);
    if (!userTimers || !userTimers.has(bookingId)) {
      return false;
    }
    
    const timers = userTimers.get(bookingId);
    if (timers && timers.length > 0) {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      
      userTimers.delete(bookingId);
      
      this.sendToUser(userId, 'booking_timer_stopped', {
        bookingId,
        timestamp: Date.now()
      });
      
      return true;
    }
    
    return false;
  }

  private async handleChatMessage(senderId: string, data: any, socket: Socket): Promise<void> {
    try {
      console.log('SocketService.handleChatMessage called with:', {senderId, data});
      
      if (!data.receiverId || !data.content) {
        socket.emit('error', {
          message: 'receiverId and content are required'
        });
        return;
      }
      
      // Import User model để kiểm tra role
      const User = require('../models/user.model').User;
      // Import chatService thay vì MessageService
      const chatService = require('../services/chat.service').default;
      
      // Xác định ai là user/admin
      const user = await User.findById(senderId);
      const receiver = await User.findById(data.receiverId);
      
      if (!user || !receiver) {
        socket.emit('error', {
          message: 'User or receiver not found'
        });
        return;
      }
      
      // Xác định chính xác vai trò
      const senderIsAdmin = user.role === 'admin';
      const receiverIsAdmin = receiver.role === 'admin';
      
      if ((senderIsAdmin && receiverIsAdmin) || (!senderIsAdmin && !receiverIsAdmin)) {
        socket.emit('error', {
          message: 'Only user-admin conversations are allowed'
        });
        return;
      }
      
      // Xác định userId và adminId dựa vào role
      const userId = senderIsAdmin ? data.receiverId : senderId;
      const adminId = senderIsAdmin ? senderId : data.receiverId;
      
      // Lấy hoặc tạo conversation
      const conversation = await chatService.getOrCreateConversation(userId, adminId);
      
      // Xác định sender role
      const sender = senderIsAdmin ? 'admin' : 'user';
      
      // Gửi tin nhắn sử dụng chatService
      const message = await chatService.sendMessage(
        conversation._id.toString(),
        sender,
        data.content
      );
      
      // Gửi tin nhắn đến người nhận
      this.sendToUser(data.receiverId, 'new_message', {
        message: {
          _id: message._id,
          sender: message.sender,
          content: message.content,
          createdAt: message.createdAt,
          userId: message.userId,
          adminId: message.adminId,
          isRead: message.isRead,
          conversationId: message.conversationId
        }
      });
      
      // Thông báo cho người gửi
      socket.emit('message_sent', {
        messageId: message._id,
        receiverId: data.receiverId,
        timestamp: Date.now()
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error handling chat message:', errorMessage);
      socket.emit('error', {
        message: 'Failed to send message: ' + errorMessage
      });
    }
  }

  private async handleMessageRead(userId: string, data: any): Promise<void> {
    try {
      if (!data.messageId) {
        return;
      }
      
      // Import Message model
      const Message = require('../models/message.model').Message;
      // Import chatService
      const chatService = require('../services/chat.service').default;
      
      // Tìm message để lấy thông tin conversationId
      const message = await Message.findById(data.messageId);
      
      if (!message) {
        console.error('Message not found:', data.messageId);
        return;
      }
      
      // Lấy thông tin user
      const User = require('../models/user.model').User;
      const user = await User.findById(userId);
      
      if (!user) {
        console.error('User not found:', userId);
        return;
      }
      
      // Xác định role của người đọc
      const userRole = user.role === 'admin' ? 'admin' : 'user';
      
      // Đánh dấu tất cả tin nhắn đã đọc trong conversation
      await chatService.markConversationAsRead(message.conversationId.toString(), userRole);
      
      // Xác định người nhận thông báo (người gửi tin nhắn)
      const notifyUserId = message.sender === "user" ? message.adminId.toString() : message.userId.toString();
      
      // Gửi thông báo đã đọc
      this.sendToUser(notifyUserId, 'message_read', {
        messageId: data.messageId,
        conversationId: message.conversationId.toString(),
        reader: userRole,
        timestamp: Date.now()
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error handling message read:', errorMessage);
    }
  }
}

export default SocketService.getInstance();