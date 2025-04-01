// src/patterns/singleton/WebSocketManager.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

export enum SocketEvent {
  SEAT_STATUS_CHANGED = 'SEAT_STATUS_CHANGED',
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  SHOWTIME_UPDATED = 'SHOWTIME_UPDATED',
  MOVIE_UPDATED = 'MOVIE_UPDATED',
  JOIN_SHOWTIME_ROOM = 'JOIN_SHOWTIME_ROOM',
  LEAVE_SHOWTIME_ROOM = 'LEAVE_SHOWTIME_ROOM'
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private io: Server | null = null;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(httpServer: HTTPServer): void {
    if (this.io) {
      console.log('WebSocket server already initialized');
      return;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'], // Frontend URLs
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Xử lý sự kiện tham gia phòng suất chiếu
      socket.on(SocketEvent.JOIN_SHOWTIME_ROOM, (showtimeId: string) => {
        socket.join(`showtime-${showtimeId}`);
        console.log(`Client ${socket.id} joined room for showtime ${showtimeId}`);
      });

      // Xử lý sự kiện rời phòng suất chiếu
      socket.on(SocketEvent.LEAVE_SHOWTIME_ROOM, (showtimeId: string) => {
        socket.leave(`showtime-${showtimeId}`);
        console.log(`Client ${socket.id} left room for showtime ${showtimeId}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    console.log('WebSocket server initialized');
  }

  // Gửi thông báo cập nhật trạng thái ghế
  public notifySeatStatusChanged(showtimeId: string, seatData: any): void {
    if (!this.io) return;
    
    this.io.to(`showtime-${showtimeId}`).emit(SocketEvent.SEAT_STATUS_CHANGED, seatData);
  }

  // Gửi thông báo đặt vé mới
  public notifyBookingCreated(showtimeId: string, bookingData: any): void {
    if (!this.io) return;

    this.io.to(`showtime-${showtimeId}`).emit(SocketEvent.BOOKING_CREATED, bookingData);
  }

  // Gửi thông báo xác nhận đặt vé
  public notifyBookingConfirmed(showtimeId: string, bookingData: any): void {
    if (!this.io) return;

    this.io.to(`showtime-${showtimeId}`).emit(SocketEvent.BOOKING_CONFIRMED, bookingData);
  }

  // Gửi thông báo hủy đặt vé
  public notifyBookingCancelled(showtimeId: string, bookingData: any): void {
    if (!this.io) return;

    this.io.to(`showtime-${showtimeId}`).emit(SocketEvent.BOOKING_CANCELLED, bookingData);
  }

  // Gửi thông báo cập nhật suất chiếu
  public notifyShowtimeUpdated(showtimeId: string, showtimeData: any): void {
    if (!this.io) return;

    this.io.to(`showtime-${showtimeId}`).emit(SocketEvent.SHOWTIME_UPDATED, showtimeData);
  }

  // Gửi thông báo cập nhật phim
  public notifyMovieUpdated(movieId: string, movieData: any): void {
    if (!this.io) return;

    this.io.emit(SocketEvent.MOVIE_UPDATED, { movieId, ...movieData });
  }
}

// Export singleton instance
export const webSocketManager = WebSocketManager.getInstance();