// src/patterns/singleton/SocketIOManager.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import { verifyAccessToken } from '../../utils/jwt';
import { ChatService } from '../../services/chat.service';

// Define types for the socket events
interface SendMessageData {
  conversationId: string;
  content: string;
}

interface MarkReadData {
  messageId: string;
}

interface MarkAllReadData {
  conversationId: string;
}

interface TypingData {
  conversationId: string;
  isTyping?: boolean;
}

interface CallbackResponse {
  success: boolean;
  error?: string;
  message?: any;
  count?: number;
}

export class SocketIOManager {
  private static instance: SocketIOManager;
  private io: SocketIOServer | null = null;
  private initialized: boolean = false;
  private userSocketMap: Map<string, string[]> = new Map(); // userId -> socketIds[]
  
  private constructor() {}

  public static getInstance(): SocketIOManager {
    if (!SocketIOManager.instance) {
      SocketIOManager.instance = new SocketIOManager();
    }
    return SocketIOManager.instance;
  }

  public initialize(server: http.Server): void {
    if (this.initialized) {
      console.log('SocketIOManager already initialized');
      return;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'https://frontend-movies-xo0l.onrender.com'],
        credentials: true
      }
    });

    this.setupSocketServer();
    this.initialized = true;
    console.log('Socket.IO server initialized');
  }

  private setupSocketServer(): void {
    if (!this.io) {
      throw new Error('Socket.IO server not initialized');
    }
  
    // Middleware xác thực
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        const decoded = verifyAccessToken(token as string);
        if (!decoded || typeof decoded !== 'object' || !decoded.id) {
          return next(new Error('Invalid authentication token'));
        }
        
        // Lưu thông tin user vào socket
        socket.data.user = decoded;
        next();
        
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
    
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user.id;
      
      console.log(`[Socket.IO] User connected: ${userId}`);
      
      // Đăng ký socket vào userId
      this.registerUserSocket(userId, socket.id);
      
      // Xử lý các sự kiện
      this.setupSocketEvents(socket);
      
      // Xử lý ngắt kết nối
      socket.on('disconnect', () => {
        console.log(`[Socket.IO] User disconnected: ${userId}`);
        this.unregisterUserSocket(userId, socket.id);
      });
    });
  }
  
  private registerUserSocket(userId: string, socketId: string): void {
    const userSockets = this.userSocketMap.get(userId) || [];
    userSockets.push(socketId);
    this.userSocketMap.set(userId, userSockets);
    
    console.log(`[Socket.IO] Socket registered for user ${userId}: ${socketId}`);
    console.log(`[Socket.IO] User ${userId} has ${userSockets.length} active connections`);
  }
  
  private unregisterUserSocket(userId: string, socketId: string): void {
    const userSockets = this.userSocketMap.get(userId) || [];
    const updatedSockets = userSockets.filter(id => id !== socketId);
    
    if (updatedSockets.length > 0) {
      this.userSocketMap.set(userId, updatedSockets);
    } else {
      this.userSocketMap.delete(userId);
    }
    
    console.log(`[Socket.IO] Socket unregistered for user ${userId}: ${socketId}`);
  }
  
  private setupSocketEvents(socket: Socket): void {
    const userId = socket.data.user.id;
    const chatService = new ChatService();
    
    // Xử lý gửi tin nhắn
    socket.on('send_message', async (data: SendMessageData, callback: (response: CallbackResponse) => void) => {
      try {
        const { conversationId, content } = data;
        
        if (!conversationId || !content) {
          return callback({ 
            success: false, 
            error: 'Missing required fields' 
          });
        }
        
        // Kiểm tra quyền truy cập conversation
        const canAccess = await chatService.isUserInConversation(userId, conversationId);
        if (!canAccess) {
          return callback({ 
            success: false, 
            error: 'Access denied to this conversation' 
          });
        }
        
        // Gửi tin nhắn
        const message = await chatService.sendMessage(conversationId, userId, content);
        
        // Lấy conversation để biết người nhận
        const conversation = await chatService.getConversation(conversationId);
        
        if (conversation) {
          // Gửi tin nhắn đến người nhận
          const receiverId = conversation.userId.toString() === userId ? 
            conversation.adminId.toString() : conversation.userId.toString();
            
          this.sendToUser(receiverId, 'new_message', { message });
          
          // Gửi xác nhận về cho người gửi (không cần thiết nhưng có thể hữu ích)
          callback({ 
            success: true, 
            message 
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error processing message:', error);
        callback({ 
          success: false, 
          error: 'Failed to send message' 
        });
      }
    });
    
    // Xử lý đánh dấu đã đọc
    socket.on('mark_read', async (data: MarkReadData, callback: (response: CallbackResponse) => void) => {
      try {
        const { messageId } = data;
        
        if (!messageId) {
          return callback({ 
            success: false, 
            error: 'Message ID is required' 
          });
        }
        
        const result = await chatService.markAsRead(messageId, userId);
        
        if (result.success) {
          // Thông báo cho người gửi biết tin nhắn đã được đọc
          this.sendToUser(result.senderId, 'message_read', { 
            messageId,
            readerId: userId
          });
          
          callback({ success: true });
        } else {
          callback({ 
            success: false, 
            error: result.error || 'Failed to mark as read' 
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error marking message as read:', error);
        callback({ 
          success: false, 
          error: 'Failed to mark message as read' 
        });
      }
    });
    
    // Xử lý đánh dấu đã đọc tất cả
    socket.on('mark_all_read', async (data: MarkAllReadData, callback: (response: CallbackResponse) => void) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) {
          return callback({ 
            success: false, 
            error: 'Conversation ID is required' 
          });
        }
        
        const result = await chatService.markAllAsRead(conversationId, userId);
        
        callback({ 
          success: true, 
          count: result.count 
        });
        
        // Thông báo cho người khác trong conversation
        const conversation = await chatService.getConversation(conversationId);
        
        if (conversation) {
          const otherUserId = conversation.userId.toString() === userId ? 
            conversation.adminId.toString() : conversation.userId.toString();
            
          this.sendToUser(otherUserId, 'all_messages_read', { 
            conversationId,
            readerId: userId
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error marking all as read:', error);
        callback({ 
          success: false, 
          error: 'Failed to mark all as read' 
        });
      }
    });
    
    // Xử lý "đang gõ"
    socket.on('typing', async (data: TypingData) => {
      try {
        const { conversationId, isTyping } = data;
        
        if (!conversationId) return;
        
        const conversation = await chatService.getConversation(conversationId);
        
        if (conversation) {
          const receiverId = conversation.userId.toString() === userId ? 
            conversation.adminId.toString() : conversation.userId.toString();
            
          this.sendToUser(receiverId, 'typing', { 
            conversationId,
            userId,
            isTyping: isTyping === true
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error processing typing event:', error);
      }
    });
  }
  
  public sendToUser(userId: string, event: string, data: any): void {
    const socketIds = this.userSocketMap.get(userId.toString()) || [];
    
    if (socketIds.length > 0) {
      console.log(`[Socket.IO] Sending ${event} to user ${userId} (${socketIds.length} connections)`);
      
      for (const socketId of socketIds) {
        if (this.io) {
          this.io.to(socketId).emit(event, data);
        }
      }
    } else {
      console.log(`[Socket.IO] No active connections for user ${userId}`);
    }
  }
  
  public broadcastToAll(event: string, data: any, excludeUserId?: string): void {
    if (!this.io) return;
    
    if (excludeUserId) {
      const excludeSocketIds = this.userSocketMap.get(excludeUserId) || [];
      
      for (const [userId, socketIds] of this.userSocketMap.entries()) {
        if (userId !== excludeUserId) {
          for (const socketId of socketIds) {
            this.io.to(socketId).emit(event, data);
          }
        }
      }
    } else {
      this.io.emit(event, data);
    }
  }

  public getConnectedUserIds(): string[] {
    return Array.from(this.userSocketMap.keys());
  }
}

export default SocketIOManager.getInstance();