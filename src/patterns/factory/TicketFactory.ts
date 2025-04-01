// Triển khai Factory Pattern để tạo vé (Ticket)

export interface Ticket {
  type: string; // Loại vé (chuỗi: "standard", "premium", "vip")
  price: number; // Giá vé (số tiền)
  getDescription(): string; // Phương thức trả về mô tả của vé
  applyDiscount(percentage: number): void; // Phương thức áp dụng giảm giá theo phần trăm
}

// Sản phẩm cụ thể: Vé Standard (Vé cơ bản)
class StandardTicket implements Ticket {
  type: string = 'standard'; // Loại vé là "standard"
  price: number; // Giá vé

  constructor(price: number) {
    this.price = price; // Khởi tạo giá vé từ tham số đầu vào
  }

  getDescription(): string {
    return `Vé Standard - Ghế ngồi thông thường, ${this.price} VND`; // Trả về mô tả vé cơ bản
  }

  applyDiscount(percentage: number): void {
    // Áp dụng giảm giá: Giảm giá = giá gốc * (phần trăm / 100)
    this.price = this.price - (this.price * (percentage / 100));
  }
}

// Sản phẩm cụ thể: Vé Premium (Vé cao cấp)
class PremiumTicket implements Ticket {
  type: string = 'premium'; // Loại vé là "premium"
  price: number; // Giá vé

  constructor(price: number) {
    this.price = price; // Khởi tạo giá vé từ tham số đầu vào
  }

  getDescription(): string {
    return `Vé Premium - Ghế ngồi tốt hơn với không gian rộng, ${this.price} VND`; // Trả về mô tả vé cao cấp
  }

  applyDiscount(percentage: number): void {
    // Áp dụng giảm giá: Giảm giá = giá gốc * (phần trăm / 100)
    this.price = this.price - (this.price * (percentage / 100));
  }
}

// Sản phẩm cụ thể: Vé VIP
class VIPTicket implements Ticket {
  type: string = 'vip'; // Loại vé là "vip"
  price: number; // Giá vé

  constructor(price: number) {
    this.price = price; // Khởi tạo giá vé từ tham số đầu vào
  }

  getDescription(): string {
    return `Vé VIP - Ghế ngồi sang trọng có dịch vụ ăn uống, ${this.price} VND`; // Trả về mô tả vé VIP
  }

  applyDiscount(percentage: number): void {
    // Áp dụng giảm giá cho vé VIP với quy tắc khác: Tối đa giảm 15%
    const actualDiscount = Math.min(percentage, 15); // Lấy giá trị nhỏ hơn giữa phần trăm yêu cầu và 15%
    this.price = this.price - (this.price * (actualDiscount / 100)); // Giảm giá dựa trên phần trăm thực tế
  }
}

// Lớp Factory (Nhà máy) để tạo vé
export class TicketFactory {
  // Phương thức tĩnh tạo vé dựa trên loại vé và giá
  static createTicket(type: string, price: number): Ticket {
    switch (type.toLowerCase()) { // Chuyển loại vé về chữ thường để so sánh
      case 'standard':
        return new StandardTicket(price); // Tạo vé Standard
      case 'premium':
        return new PremiumTicket(price); // Tạo vé Premium
      case 'vip':
        return new VIPTicket(price); // Tạo vé VIP
      default:
        throw new Error(`Loại vé ${type} không được hỗ trợ.`); // Ném lỗi nếu loại vé không hợp lệ
    }
  }
}