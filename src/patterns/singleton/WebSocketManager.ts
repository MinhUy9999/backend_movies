import WebSocket from 'ws';
import http from 'http';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../../utils/jwt';
import { Booking } from '../../models/booking.model';
import { Seat } from '../../models/seat.model';

// Define client structure
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
    // Private constructor for singleton pattern
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
        // Extract token from URL query parameters
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          ws.close(1008, 'Authentication required');
          return;
        }
        
        // Verify token
        const decoded = verifyAccessToken(token);
        if (!decoded || typeof decoded !== 'object' || !decoded.id) {
          ws.close(1008, 'Invalid authentication token');
          return;
        }
        
        const userId = decoded.id.toString();
        
        // Register the client
        this.registerClient(userId, ws);
        
        // Handle client messages
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
        
        // Handle client disconnection
        ws.on('close', () => {
          this.unregisterClient(userId);
        });
        
        // Send welcome message
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
    // If client already exists, close existing connection
    if (this.clients.has(userId)) {
      const existingClient = this.clients.get(userId);
      if (existingClient && existingClient.ws.readyState === WebSocket.OPEN) {
        existingClient.ws.close(1000, 'New connection established');
      }
      
      // Preserve any existing booking timers
      const existingTimers = existingClient?.bookingTimers || new Map();
      
      this.clients.set(userId, {
        userId,
        ws,
        bookingTimers: existingTimers
      });
    } else {
      // Create new client entry
      this.clients.set(userId, {
        userId,
        ws,
        bookingTimers: new Map()
      });
    }
    
    console.log(`Client connected: ${userId}`);
  }
  
  private unregisterClient(userId: string): void {
    const client = this.clients.get(userId);
    
    if (client) {
      // Clear all booking timers
      for (const [bookingId, timer] of client.bookingTimers.entries()) {
        clearTimeout(timer);
        console.log(`Timer cleared for booking ${bookingId}`);
      }
      
      this.clients.delete(userId);
      console.log(`Client disconnected: ${userId}`);
    }
  }
  
  private handleMessage(userId: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          this.sendToUser(userId, {
            type: 'pong',
            timestamp: Date.now()
          });
          break;
          
        default:
          console.log(`Received unknown message type from ${userId}:`, data);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  public sendToUser(userId: string, data: any): boolean {
    const client = this.clients.get(userId);
    
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
      return true;
    }
    
    return false;
  }
  
  public broadcastToAll(data: any, excludeUserId?: string): void {
    for (const [userId, client] of this.clients.entries()) {
      // Skip excluded user
      if (excludeUserId && userId === excludeUserId) continue;
      
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    }
  }
  
  public startBookingTimer(userId: string, bookingId: string, expirationMinutes: number = 15): boolean {
    const client = this.clients.get(userId);
    
    if (!client) return false;
    
    // Clear any existing timer for this booking
    this.stopBookingTimer(userId, bookingId);
    
    // Set the expiration date
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    
    // Create countdown notifications
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
    
    // Set the main expiration timer
    const timer = setTimeout(async () => {
      try {
        // Remove the timer from the client's map
        client.bookingTimers.delete(bookingId);
        
        // Check if booking still exists and is still in reserved status
        const booking = await Booking.findOne({
          _id: new mongoose.Types.ObjectId(bookingId),
          bookingStatus: 'reserved',
          paymentStatus: 'pending'
        });
        
        if (booking) {
          // Update booking to cancelled
          await Booking.findByIdAndUpdate(bookingId, {
            bookingStatus: 'cancelled'
          });
          
          // Release all seats
          await Seat.updateMany(
            { bookingId: new mongoose.Types.ObjectId(bookingId) },
            {
              status: 'available',
              $unset: { bookingId: 1, expiresAt: 1 }
            }
          );
          
          // Notify user
          this.sendToUser(userId, {
            type: 'booking_expired',
            bookingId
          });
        }
      } catch (error) {
        console.error(`Error handling booking expiration for ${bookingId}:`, error);
      }
    }, expiresAt.getTime() - Date.now());
    
    // Store the timer
    client.bookingTimers.set(bookingId, timer);
    
    // Notify about reservation
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
}

// Export default instance
export default WebSocketManager.getInstance();