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

  public startBookingTimer(userId: string, bookingId: string, expirationMinutes: number = 15): boolean {
    // Notify user about booking reservation and expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    
    this.sendToUser(userId, 'booking_reserved', {
      bookingId,
      expiresAt: expiresAt.toISOString()
    });
    
    // Schedule notifications for remaining time
    const countdownMinutes = [10, 5, 2, 1];
    for (const minute of countdownMinutes) {
      if (minute < expirationMinutes) {
        const notifyAt = new Date();
        notifyAt.setMinutes(notifyAt.getMinutes() + expirationMinutes - minute);
        
        setTimeout(() => {
          this.sendToUser(userId, 'booking_expiring', {
            bookingId,
            minutesLeft: minute
          });
        }, notifyAt.getTime() - Date.now());
      }
    }
    
    return true;
  }

  private async handleChatMessage(senderId: string, data: any, socket: Socket): Promise<void> {
    try {
      if (!data.receiverId || !data.content) {
        socket.emit('error', {
          message: 'receiverId and content are required'
        });
        return;
      }
      
      const MessageService = require('../services/message.service').MessageService;
      const messageService = new MessageService();
      
      const senderIsAdmin = await messageService.isUserAdmin(senderId);
      const receiverIsAdmin = await messageService.isUserAdmin(data.receiverId);
      
      if (!senderIsAdmin && !receiverIsAdmin) {
        socket.emit('error', {
          message: 'Regular users can only chat with admins'
        });
        return;
      }
      
      const message = await messageService.sendMessage(
        senderId,
        data.receiverId,
        data.content
      );
      
      // Send to receiver
      this.sendToUser(data.receiverId, 'new_message', {
        message: {
          _id: message._id,
          sender: message.sender,
          content: message.content,
          createdAt: message.createdAt,
          userId: message.userId,
          adminId: message.adminId,
          isRead: message.isRead,
        }
      });
      
      // Send confirmation to sender
      socket.emit('message_sent', {
        messageId: message._id,
        receiverId: data.receiverId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', {
        message: 'Failed to send message'
      });
    }
  }

  private async handleMessageRead(userId: string, data: any): Promise<void> {
    try {
      if (!data.messageId) {
        return;
      }
      
      const MessageService = require('../services/message.service').MessageService;
      const messageService = new MessageService();
      
      const message = await messageService.markAsRead(data.messageId, userId);
      
      if (message) {
        const notifyUserId = message.sender === "user" ? message.adminId.toString() : message.userId.toString();
        
        this.sendToUser(notifyUserId, 'message_read', {
          messageId: data.messageId,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error handling message read:', error);
    }
  }
}

export default SocketService.getInstance();