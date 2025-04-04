import WebSocket from 'ws';
import http from 'http';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../../utils/jwt';
import { Booking } from '../../models/booking.model';
import { Seat } from '../../models/seat.model';

interface Client {
  userId: string;
  ws: WebSocket;
  bookingTimers: Map<string, NodeJS.Timeout>;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, Client> = new Map();
  private initialized: boolean = false;
  
  private constructor() {
  }

  public getConnectedClientIds(): string[] {
    return Array.from(this.clients.keys());
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(server: http.Server): void {
    if (this.initialized) {
      console.log('WebSocketManager already initialized');
      return;
    }

    this.wss = new WebSocket.Server({ server });
    this.init();
    this.initialized = true;
  }

  private init(): void {
    if (!this.wss) {
      throw new Error('WebSocket server not initialized');
    }
  
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          ws.close(1008, 'Authentication required');
          return;
        }
        
        // Decode token and extract user ID
        const decoded = verifyAccessToken(token);
        if (!decoded || typeof decoded !== 'object' || !decoded.id) {
          ws.close(1008, 'Invalid authentication token');
          return;
        }
        
        const userId = decoded.id.toString();
        
        console.log(`[WS] New connection from user: ${userId}`);
        this.registerClient(userId, ws);
        
        console.log(`[WS] Currently connected clients: ${Array.from(this.clients.keys()).join(', ')}`);
        
        ws.on('message', (message: WebSocket.Data) => {
          let msgStr: string;
          
          if (Buffer.isBuffer(message)) {
            msgStr = message.toString();
          } else if (Array.isArray(message)) {
            msgStr = Buffer.concat(message).toString();
          } else {
            msgStr = message.toString();
          }
          
          this.handleMessage(userId, msgStr);
        });
        
        ws.on('close', () => {
          this.unregisterClient(userId);
        });
        
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Successfully connected to booking service'
        }));
        
      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1011, 'Server error');
      }
    });
  }
  
  private registerClient(userId: string, ws: WebSocket): void {
    const userIdStr = userId.toString();
    if (this.clients.has(userIdStr)) {
      const existingClient = this.clients.get(userId);
      if (existingClient && existingClient.ws.readyState === WebSocket.OPEN) {
        existingClient.ws.close(1000, 'New connection established');
      }
      
      const existingTimers = existingClient?.bookingTimers || new Map();
      
      this.clients.set(userId, {
        userId,
        ws,
        bookingTimers: existingTimers
      });
    } else {
      this.clients.set(userIdStr, {
        userId: userIdStr,
        ws,
        bookingTimers: new Map()
      });
    }
    
    console.log(`[WS] Client connected: ${userIdStr}`);
    console.log(`[WS] Total clients connected: ${this.clients.size}`);  
  }
  
  private unregisterClient(userId: string): void {
    const client = this.clients.get(userId);
    
    if (client) {
      for (const [bookingId, timer] of client.bookingTimers.entries()) {
        clearTimeout(timer);
        console.log(`Timer cleared for booking ${bookingId}`);
      }
      
      this.clients.delete(userId);
      console.log(`Client disconnected: ${userId}`);
    }
  }
  
  public sendToUser(userId: string, data: any): boolean {
    const userIdStr = userId.toString();
    
    console.log(`[WS] Attempting to send to user: "${userIdStr}"`);
    console.log(`[WS] Currently connected clients: ${Array.from(this.clients.keys()).join(', ')}`);
    
    let client = this.clients.get(userIdStr);
    
    if (!client) {
      const alternativeFormats = [
        userIdStr,
        userIdStr.replace(/^ObjectId\(['"](.+)['"]\)$/, '$1')
      ];
      
      for (const format of alternativeFormats) {
        if (this.clients.has(format)) {
          client = this.clients.get(format);
          console.log(`[WS] Found client using alternative format: ${format}`);
          break;
        }
      }
    }
    
    if (client) {
      console.log(`[WS] Client found for user ${userIdStr}. WebSocket state: ${client.ws.readyState}`);
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          const jsonData = JSON.stringify(data);
          console.log(`[WS] Sending data to ${userIdStr}: ${jsonData.substring(0, 100)}...`);
          client.ws.send(jsonData);
          return true;
        } catch (error) {
          console.error(`[WS] Error sending to user ${userIdStr}:`, error);
        }
      } else {
        console.log(`[WS] WebSocket not in OPEN state for user ${userIdStr}. State: ${client.ws.readyState}`);
      }
    } else {
      console.log(`[WS] No WebSocket connection found for user: ${userIdStr}`);
    }
    
    return false;
  }
  
  public broadcastToAll(data: any, excludeUserId?: string): void {
    for (const [userId, client] of this.clients.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    }
  }
  
  public startBookingTimer(userId: string, bookingId: string, expirationMinutes: number = 15): boolean {
    const client = this.clients.get(userId);
    
    if (!client) return false;
    
    this.stopBookingTimer(userId, bookingId);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    
    const countdownMinutes = [10, 5, 2, 1];
    for (const minute of countdownMinutes) {
      if (minute < expirationMinutes) {
        const notifyAt = new Date();
        notifyAt.setMinutes(notifyAt.getMinutes() + expirationMinutes - minute);
        
        setTimeout(() => {
          this.sendToUser(userId, {
            type: 'booking_expiring',
            bookingId,
            minutesLeft: minute
          });
        }, notifyAt.getTime() - Date.now());
      }
    }
    
    const timer = setTimeout(async () => {
      try {
        client.bookingTimers.delete(bookingId);
        
        const booking = await Booking.findOne({
          _id: new mongoose.Types.ObjectId(bookingId),
          bookingStatus: 'reserved',
          paymentStatus: 'pending'
        });
        
        if (booking) {
          await Booking.findByIdAndUpdate(bookingId, {
            bookingStatus: 'cancelled'
          });
          
          await Seat.updateMany(
            { bookingId: new mongoose.Types.ObjectId(bookingId) },
            {
              status: 'available',
              $unset: { bookingId: 1, expiresAt: 1 }
            }
          );
          
          this.sendToUser(userId, {
            type: 'booking_expired',
            bookingId
          });
        }
      } catch (error) {
        console.error(`Error handling booking expiration for ${bookingId}:`, error);
      }
    }, expiresAt.getTime() - Date.now());
    
    client.bookingTimers.set(bookingId, timer);
    
    this.sendToUser(userId, {
      type: 'booking_reserved',
      bookingId,
      expiresAt: expiresAt.toISOString()
    });
    
    return true;
  }
  
  public stopBookingTimer(userId: string, bookingId: string): boolean {
    const client = this.clients.get(userId);
    
    if (!client) return false;
    
    const timer = client.bookingTimers.get(bookingId);
    if (timer) {
      clearTimeout(timer);
      client.bookingTimers.delete(bookingId);
      return true;
    }
    
    return false;
  }
  
  public notifySeatsUpdated(showtimeId: string): void {
    this.broadcastToAll({
      type: 'seats_updated',
      showtimeId
    });
  }

private handleMessage(userId: string, message: string): void {
  try {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'ping':
        this.sendToUser(userId, {
          type: 'pong',
          timestamp: Date.now()
        });
        break;
        
      case 'chat_message':
        this.handleChatMessage(userId, data);
        break;
        
      case 'message_read':
        this.handleMessageRead(userId, data);
        break;
        
      default:
        console.log(`Received unknown message type from ${userId}:`, data);
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
  }
}

private async handleChatMessage(senderId: string, data: any): Promise<void> {
  try {
    if (!data.receiverId || !data.content) {
      this.sendToUser(senderId, {
        type: 'error',
        message: 'receiverId and content are required'
      });
      return;
    }
    
    const MessageService = require('../../services/message.service').MessageService;
    const messageService = new MessageService();
    
    const senderIsAdmin = await messageService.isUserAdmin(senderId);
    const receiverIsAdmin = await messageService.isUserAdmin(data.receiverId);
    
    if (!senderIsAdmin && !receiverIsAdmin) {
      this.sendToUser(senderId, {
        type: 'error',
        message: 'Regular users can only chat with admins'
      });
      return;
    }
    
    const message = await messageService.sendMessage(
      senderId,
      data.receiverId,
      data.content
    );
    
    this.sendToUser(data.receiverId, {
      type: 'new_message',
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
    
    this.sendToUser(senderId, {
      type: 'message_sent',
      messageId: message._id,
      receiverId: data.receiverId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error handling chat message:', error);
    this.sendToUser(senderId, {
      type: 'error',
      message: 'Failed to send message'
    });
  }
}

public sendMessage(senderId: string, receiverId: string, message: any): boolean {
  console.log(`Sending message from ${senderId} to ${receiverId}:`, message);
  
  const receiverSuccess = this.sendToUser(receiverId, {
    type: 'new_message',
    message
  });
  
  const senderSuccess = this.sendToUser(senderId, {
    type: 'message_sent',
    message
  });
  
  console.log(`Message delivery status - receiver: ${receiverSuccess}, sender: ${senderSuccess}`);
  
  return receiverSuccess || senderSuccess;
}

private async handleMessageRead(userId: string, data: any): Promise<void> {
  try {
    if (!data.messageId) {
      return;
    }
    
    const MessageService = require('../../services/message.service').MessageService;
    const messageService = new MessageService();
    
    const message = await messageService.markAsRead(data.messageId, userId);
    
    if (message) {
      const notifyUserId = message.sender === "user" ? message.adminId.toString() : message.userId.toString();
      
      this.sendToUser(notifyUserId, {
        type: 'message_read',
        messageId: data.messageId,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Error handling message read:', error);
  }
}

  public getOnlineUserIds(): Set<string> {
    return new Set(this.clients.keys());
  }
}

export default WebSocketManager.getInstance();