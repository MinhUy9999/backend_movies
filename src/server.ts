// src/server.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db } from "./patterns/singleton/DatabaseSingleton";
import { webSocketManager } from "./patterns/singleton/WebSocketManager";
import router from "./routes/index.routes";
import { notificationService } from "./patterns/observer/NotificationSystem";
import { EmailNotification, SMSNotification, PushNotification } from "./patterns/observer/NotificationSystem";
import { seatCleanupJob } from "./jobs/seat-cleanup.job"; // Import công việc dọn dẹp ghế
import path from "path";
import http from "http";

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Tạo HTTP server từ Express app
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['*'], // Frontend URLs
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup notification observers
const emailNotifier = new EmailNotification();
const smsNotifier = new SMSNotification();
const pushNotifier = new PushNotification();

// Register notification observers
notificationService.subscribe('booking.created', emailNotifier);
notificationService.subscribe('booking.confirmed', emailNotifier);
notificationService.subscribe('booking.cancelled', emailNotifier);
notificationService.subscribe('payment.success', emailNotifier);
notificationService.subscribe('payment.failed', emailNotifier);

notificationService.subscribe('booking.created', smsNotifier);
notificationService.subscribe('booking.confirmed', smsNotifier);
notificationService.subscribe('payment.success', smsNotifier);

notificationService.subscribe('booking.confirmed', pushNotifier);
notificationService.subscribe('payment.success', pushNotifier);
notificationService.subscribe('payment.failed', pushNotifier);

// Connect to database
db.connect()
  .then(() => {
    // Routes
    app.use("/api", router);

    // Health check route
    app.get("/health", (req, res) => {
      res.status(200).json({ status: "UP", message: "Cinema Booking API is running" });
    });

    // Khởi tạo WebSocket server
    webSocketManager.initialize(server);
    
    // Bắt đầu công việc dọn dẹp ghế định kỳ
    seatCleanupJob.start();
    
    // Chạy công việc dọn dẹp ghế ngay lập tức (để dọn dẹp các ghế đã hết hạn từ trước)
    seatCleanupJob.runNow().catch(err => console.error("Initial seat cleanup error:", err));

    // Start HTTP server (KHÔNG phải app.listen)
    server.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      console.log(`💚 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket server is running`);
      console.log(`🧹 Seat cleanup job started`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  // Dừng công việc dọn dẹp ghế
  seatCleanupJob.stop();
  await db.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  // Dừng công việc dọn dẹp ghế
  seatCleanupJob.stop();
  await db.disconnect();
  process.exit(0);
});