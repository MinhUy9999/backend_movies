// Triển khai Singleton Pattern cho kết nối database
import mongoose from "mongoose"; // Nhập thư viện mongoose để tương tác với MongoDB
import dotenv from "dotenv"; // Nhập thư viện dotenv để đọc biến môi trường từ file .env

dotenv.config(); // Tải các biến môi trường từ file .env vào process.env

export class DatabaseSingleton { // Định nghĩa lớp DatabaseSingleton
  private static instance: DatabaseSingleton; // Biến tĩnh để lưu instance duy nhất của lớp (đặc trưng của Singleton)
  private isConnected: boolean = false; // Biến theo dõi trạng thái kết nối database, mặc định là false (chưa kết nối)

  private constructor() { // Constructor riêng tư để ngăn việc tạo instance từ bên ngoài
    // Private constructor to prevent instantiation
    console.log("DatabaseSingleton instance created"); // Thông báo khi instance được tạo
  }

  public static getInstance(): DatabaseSingleton { // Phương thức tĩnh để lấy instance duy nhất
    if (!DatabaseSingleton.instance) { // Kiểm tra nếu chưa có instance
      DatabaseSingleton.instance = new DatabaseSingleton(); // Tạo instance mới nếu chưa tồn tại
    }
    return DatabaseSingleton.instance; // Trả về instance duy nhất
  }

  public async connect(): Promise<void> { // Phương thức kết nối tới MongoDB
    if (this.isConnected) { // Kiểm tra nếu đã kết nối
      console.log("Already connected to MongoDB"); // Thông báo đã kết nối rồi
      return; // Thoát hàm nếu đã kết nối
    }

    try { // Bắt đầu khối try-catch để xử lý lỗi
      const MONGO_URI = process.env.MONGO_URI as string; // Lấy URI kết nối từ biến môi trường

      if (!MONGO_URI) { // Kiểm tra nếu MONGO_URI không tồn tại
        throw new Error("❌ MONGO_URI is not defined in .env file"); // Ném lỗi nếu thiếu URI
      }

      console.log("📡 Initializing MongoDB connection..."); // Thông báo đang khởi tạo kết nối

      await mongoose.connect(MONGO_URI, { // Kết nối tới MongoDB với URI
        serverSelectionTimeoutMS: 5000, // Đặt timeout 5 giây nếu không kết nối được
      });

      this.isConnected = true; // Đánh dấu trạng thái đã kết nối
      console.log("✅ Connected to MongoDB"); // Thông báo kết nối thành công
    } catch (error) { // Bắt lỗi nếu có
      console.error("❌ Database connection error:", error); // Thông báo lỗi kết nối
      throw error; // Ném lỗi để xử lý bên ngoài
    }
  }

  public async disconnect(): Promise<void> { // Phương thức ngắt kết nối MongoDB
    if (!this.isConnected) { // Kiểm tra nếu chưa kết nối
      console.log("Not connected to MongoDB"); // Thông báo chưa kết nối
      return; // Thoát hàm nếu chưa kết nối
    }

    try { // Bắt đầu khối try-catch để xử lý lỗi
      await mongoose.disconnect(); // Ngắt kết nối với MongoDB
      this.isConnected = false; // Đánh dấu trạng thái đã ngắt kết nối
      console.log("✅ Disconnected from MongoDB"); // Thông báo ngắt kết nối thành công
    } catch (error) { // Bắt lỗi nếu có
      console.error("❌ Database disconnection error:", error); // Thông báo lỗi ngắt kết nối
      throw error; // Ném lỗi để xử lý bên ngoài
    }
  }

  public isConnectedToDatabase(): boolean { // Phương thức kiểm tra trạng thái kết nối
    return this.isConnected; // Trả về giá trị của isConnected (true nếu đã kết nối, false nếu chưa)
  }
}

// Xuất instance mặc định
export const db = DatabaseSingleton.getInstance(); // Tạo và xuất instance singleton để sử dụng ở các file khác