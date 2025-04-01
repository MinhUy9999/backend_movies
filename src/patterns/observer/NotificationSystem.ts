// Triển khai Observer Pattern để quản lý thông báo

// Các loại sự kiện thông báo
export type NotificationEvent = 'booking.created' | 'booking.cancelled' | 'booking.confirmed' | 'payment.success' | 'payment.failed';
// Định nghĩa các sự kiện có thể xảy ra: tạo đặt vé, hủy đặt vé, xác nhận đặt vé, thanh toán thành công, thanh toán thất bại

// Dữ liệu thông báo
export interface NotificationData {
  userId?: string; // ID người dùng (không bắt buộc)
  email?: string; // Email người dùng (không bắt buộc)
  phone?: string; // Số điện thoại người dùng (không bắt buộc)
  bookingId?: string; // ID đặt vé (không bắt buộc)
  movieTitle?: string; // Tên phim (không bắt buộc)
  theaterName?: string; // Tên rạp chiếu (không bắt buộc)
  showtime?: Date; // Thời gian chiếu (không bắt buộc)
  seats?: string[]; // Danh sách ghế ngồi (không bắt buộc)
  amount?: number; // Số tiền (không bắt buộc)
  [key: string]: any; // Cho phép thêm các thuộc tính tùy ý khác
}

// Giao diện cho các Observer (Đối tượng quan sát)
export interface NotificationObserver {
  update(event: NotificationEvent, data: NotificationData): Promise<void>; // Phương thức cập nhật thông báo khi có sự kiện
}

// Observer cụ thể: Thông báo qua Email
export class EmailNotification implements NotificationObserver {
  async update(event: NotificationEvent, data: NotificationData): Promise<void> {
    if (!data.email) { // Kiểm tra xem có email không
      console.log("Bỏ qua thông báo email: Không có email được cung cấp");
      return;
    }

    console.log(`Gửi thông báo email cho ${event} tới ${data.email}`); // Mô phỏng gửi email

    let subject = ''; // Tiêu đề email
    let message = ''; // Nội dung email

    switch (event) { // Xử lý nội dung theo loại sự kiện
      case 'booking.created':
        subject = 'Đặt vé của bạn đã được tạo';
        message = `Kính gửi khách hàng, đặt vé của bạn cho ${data.movieTitle} tại ${data.theaterName} vào ${data.showtime} đã được tạo.`;
        break;
      case 'booking.confirmed':
        subject = 'Đặt vé của bạn đã được xác nhận';
        message = `Kính gửi khách hàng, đặt vé của bạn cho ${data.movieTitle} tại ${data.theaterName} vào ${data.showtime} đã được xác nhận.`;
        break;
      case 'booking.cancelled':
        subject = 'Đặt vé của bạn đã bị hủy';
        message = `Kính gửi khách hàng, đặt vé của bạn cho ${data.movieTitle} tại ${data.theaterName} vào ${data.showtime} đã bị hủy.`;
        break;
      case 'payment.success':
        subject = 'Thanh toán thành công';
        message = `Kính gửi khách hàng, thanh toán ${data.amount} cho đặt vé ${data.bookingId} đã thành công.`;
        break;
      case 'payment.failed':
        subject = 'Thanh toán thất bại';
        message = `Kính gửi khách hàng, thanh toán ${data.amount} cho đặt vé ${data.bookingId} đã thất bại.`;
        break;
    }

    console.log(`Tiêu đề email: ${subject}`); // In tiêu đề email
    console.log(`Nội dung email: ${message}`); // In nội dung email

    // Mô phỏng gửi email (chờ 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Đã gửi thông báo email tới ${data.email}`);
  }
}

// Observer cụ thể: Thông báo qua SMS
export class SMSNotification implements NotificationObserver {
  async update(event: NotificationEvent, data: NotificationData): Promise<void> {
    if (!data.phone) { // Kiểm tra xem có số điện thoại không
      console.log("Bỏ qua thông báo SMS: Không có số điện thoại được cung cấp");
      return;
    }

    console.log(`Gửi thông báo SMS cho ${event} tới ${data.phone}`); // Mô phỏng gửi SMS

    let message = ''; // Nội dung SMS

    switch (event) { // Xử lý nội dung theo loại sự kiện
      case 'booking.created':
        message = `Đặt vé của bạn cho ${data.movieTitle} vào ${data.showtime} đã được tạo.`;
        break;
      case 'booking.confirmed':
        message = `Đặt vé của bạn cho ${data.movieTitle} vào ${data.showtime} đã được xác nhận.`;
        break;
      case 'booking.cancelled':
        message = `Đặt vé của bạn cho ${data.movieTitle} vào ${data.showtime} đã bị hủy.`;
        break;
      case 'payment.success':
        message = `Thanh toán ${data.amount} cho đặt vé ${data.bookingId} đã thành công.`;
        break;
      case 'payment.failed':
        message = `Thanh toán ${data.amount} cho đặt vé ${data.bookingId} đã thất bại.`;
        break;
    }

    console.log(`Nội dung SMS: ${message}`); // In nội dung SMS

    // Mô phỏng gửi SMS (chờ 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Đã gửi thông báo SMS tới ${data.phone}`);
  }
}

// Observer cụ thể: Thông báo đẩy (Push Notification)
export class PushNotification implements NotificationObserver {
  async update(event: NotificationEvent, data: NotificationData): Promise<void> {
    if (!data.userId) { // Kiểm tra xem có ID người dùng không
      console.log("Bỏ qua thông báo đẩy: Không có ID người dùng được cung cấp");
      return;
    }

    console.log(`Gửi thông báo đẩy cho ${event} tới người dùng ${data.userId}`); // Mô phỏng gửi thông báo đẩy

    let title = ''; // Tiêu đề thông báo đẩy
    let message = ''; // Nội dung thông báo đẩy

    switch (event) { // Xử lý nội dung theo loại sự kiện
      case 'booking.created':
        title = 'Đặt vé đã được tạo';
        message = `Đặt vé của bạn cho ${data.movieTitle} đã được tạo.`;
        break;
      case 'booking.confirmed':
        title = 'Đặt vé đã được xác nhận';
        message = `Đặt vé của bạn cho ${data.movieTitle} đã được xác nhận.`;
        break;
      case 'booking.cancelled':
        title = 'Đặt vé đã bị hủy';
        message = `Đặt vé của bạn cho ${data.movieTitle} đã bị hủy.`;
        break;
      case 'payment.success':
        title = 'Thanh toán thành công';
        message = `Thanh toán ${data.amount} của bạn đã thành công.`;
        break;
      case 'payment.failed':
        title = 'Thanh toán thất bại';
        message = `Thanh toán ${data.amount} của bạn đã thất bại.`;
        break;
    }

    console.log(`Tiêu đề thông báo đẩy: ${title}`); // In tiêu đề thông báo đẩy
    console.log(`Nội dung thông báo đẩy: ${message}`); // In nội dung thông báo đẩy

    // Mô phỏng gửi thông báo đẩy (chờ 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Đã gửi thông báo đẩy tới người dùng ${data.userId}`);
  }
}

// Chủ thể (Subject): Dịch vụ thông báo
export class NotificationService {
  private observers: Map<NotificationEvent, NotificationObserver[]> = new Map(); // Danh sách các observer theo từng sự kiện
  private static instance: NotificationService; // Instance duy nhất của dịch vụ (Singleton)

  // Constructor riêng tư để áp dụng Singleton Pattern
  private constructor() { }

  // Phương thức lấy instance duy nhất (Singleton)
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(); // Tạo instance nếu chưa có
    }
    return NotificationService.instance; // Trả về instance duy nhất
  }

  // Đăng ký observer cho một sự kiện
  subscribe(event: NotificationEvent, observer: NotificationObserver): void {
    if (!this.observers.has(event)) { // Nếu sự kiện chưa có observer
      this.observers.set(event, []); // Tạo danh sách observer mới
    }

    const observers = this.observers.get(event); // Lấy danh sách observer của sự kiện

    if (observers && !observers.includes(observer)) { // Nếu observer chưa tồn tại trong danh sách
      observers.push(observer); // Thêm observer vào danh sách
    }
  }

  // Hủy đăng ký observer khỏi một sự kiện
  unsubscribe(event: NotificationEvent, observer: NotificationObserver): void {
    if (!this.observers.has(event)) { // Nếu sự kiện không có observer
      return;
    }

    const observers = this.observers.get(event); // Lấy danh sách observer của sự kiện

    if (observers) { // Nếu danh sách tồn tại
      const index = observers.indexOf(observer); // Tìm vị trí của observer
      if (index !== -1) { // Nếu observer được tìm thấy
        observers.splice(index, 1); // Xóa observer khỏi danh sách
      }
    }
  }

  // Thông báo tới tất cả observer của một sự kiện
  async notify(event: NotificationEvent, data: NotificationData): Promise<void> {
    if (!this.observers.has(event)) { // Nếu không có observer nào cho sự kiện
      return;
    }

    const observers = this.observers.get(event); // Lấy danh sách observer của sự kiện

    if (observers) { // Nếu danh sách tồn tại
      const notificationPromises = observers.map(observer => observer.update(event, data)); // Tạo mảng promise từ các observer
      await Promise.all(notificationPromises); // Chờ tất cả promise hoàn thành (gửi thông báo đồng thời)
    }
  }
}

// Xuất instance mặc định của dịch vụ thông báo
export const notificationService = NotificationService.getInstance();