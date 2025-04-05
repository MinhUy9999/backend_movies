import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db } from "./patterns/singleton/DatabaseSingleton";
import router from "./routes/index.routes";
import { notificationService } from "./patterns/observer/NotificationSystem";
import { EmailNotification, SMSNotification, PushNotification } from "./patterns/observer/NotificationSystem";
import path from "path";
import http from "http";
import socketService from "./socket/socket.service";

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

socketService.initialize(server);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://frontend-movies-xo0l.onrender.com'],
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const emailNotifier = new EmailNotification();
const smsNotifier = new SMSNotification();
const pushNotifier = new PushNotification();

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

db.connect()
  .then(() => {
    app.use("/api", router);

    app.get("/health", (req, res) => {
      res.status(200).json({ status: "UP", message: "Cinema Booking API is running" });
    });

    app.get("/", (req, res) => {
      res.status(200).json({ status: "UP", message: "Cinema Booking API is running" });
    });

    console.log(`Attempting to listen on PORT: ${PORT}`);

    server.listen(Number(PORT), () => {
      console.log(`🚀 Server is running on PORT: ${PORT}`);
      console.log(`💚 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.io server is active`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await db.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await db.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});