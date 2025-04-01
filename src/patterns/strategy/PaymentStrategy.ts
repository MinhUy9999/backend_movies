// Triển khai Strategy Pattern cho xử lý thanh toán

// Định nghĩa interface cho kết quả thanh toán
export interface PaymentResult {
  success: boolean; // Trạng thái thành công hay thất bại
  transactionId?: string; // ID giao dịch (tùy chọn, chỉ có khi thành công)
  message: string; // Thông điệp mô tả kết quả
}

// Giao diện Strategy cho các phương thức thanh toán
export interface PaymentStrategy {
  pay(amount: number, currency: string, userData: any): Promise<PaymentResult>; // Phương thức thanh toán
  refund(transactionId: string, amount: number): Promise<PaymentResult>; // Phương thức hoàn tiền
}

// Chiến lược cụ thể: Thanh toán bằng thẻ tín dụng
export class CreditCardPayment implements PaymentStrategy { // Lớp triển khai giao diện PaymentStrategy
  async pay(amount: number, currency: string, userData: any): Promise<PaymentResult> { // Phương thức thanh toán
    try { // Bắt đầu khối try-catch để xử lý lỗi
      // Trong ứng dụng thực tế, phần này sẽ kết nối tới cổng thanh toán
      console.log(`Processing credit card payment of ${amount} ${currency}`); // Thông báo đang xử lý thanh toán thẻ tín dụng
      console.log(`Card Number: ${userData.cardNumber}`); // Hiển thị số thẻ (giả lập)

      // Mô phỏng quá trình thanh toán
      await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1 giây để giả lập thời gian xử lý

      const transactionId = `cc_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // Tạo ID giao dịch giả lập (bắt đầu bằng "cc")

      return { // Trả về kết quả thành công
        success: true,
        transactionId,
        message: "Credit card payment successful" // Thông điệp thành công
      };
    } catch (error: any) { // Bắt lỗi nếu có
      return { // Trả về kết quả thất bại
        success: false,
        message: error.message || "Credit card payment failed" // Thông điệp lỗi
      };
    }
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResult> { // Phương thức hoàn tiền
    try { // Bắt đầu khối try-catch để xử lý lỗi
      // Mô phỏng quá trình hoàn tiền
      console.log(`Refunding ${amount} from transaction ${transactionId}`); // Thông báo đang hoàn tiền
      await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1 giây để giả lập thời gian xử lý

      return { // Trả về kết quả thành công
        success: true,
        transactionId,
        message: "Credit card refund successful" // Thông điệp thành công
      };
    } catch (error: any) { // Bắt lỗi nếu có
      return { // Trả về kết quả thất bại
        success: false,
        message: error.message || "Credit card refund failed" // Thông điệp lỗi
      };
    }
  }
}

// Chiến lược cụ thể: Thanh toán bằng PayPal
export class PayPalPayment implements PaymentStrategy { // Lớp triển khai giao diện PaymentStrategy
  async pay(amount: number, currency: string, userData: any): Promise<PaymentResult> { // Phương thức thanh toán
    try { // Bắt đầu khối try-catch để xử lý lỗi
      // Trong ứng dụng thực tế, phần này sẽ kết nối tới API PayPal
      console.log(`Processing PayPal payment of ${amount} ${currency}`); // Thông báo đang xử lý thanh toán PayPal
      console.log(`PayPal Email: ${userData.email}`); // Hiển thị email PayPal (giả lập)

      // Mô phỏng quá trình thanh toán
      await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1 giây để giả lập thời gian xử lý

      const transactionId = `pp_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // Tạo ID giao dịch giả lập (bắt đầu bằng "pp")

      return { // Trả về kết quả thành công
        success: true,
        transactionId,
        message: "PayPal payment successful" // Thông điệp thành công
      };
    } catch (error: any) { // Bắt lỗi nếu có
      return { // Trả về kết quả thất bại
        success: false,
        message: error.message || "PayPal payment failed" // Thông điệp lỗi
      };
    }
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResult> { // Phương thức hoàn tiền
    try { // Bắt đầu khối try-catch để xử lý lỗi
      // Mô phỏng quá trình hoàn tiền
      console.log(`Refunding ${amount} from PayPal transaction ${transactionId}`); // Thông báo đang hoàn tiền
      await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1 giây để giả lập thời gian xử lý

      return { // Trả về kết quả thành công
        success: true,
        transactionId,
        message: "PayPal refund successful" // Thông điệp thành công
      };
    } catch (error: any) { // Bắt lỗi nếu có
      return { // Trả về kết quả thất bại
        success: false,
        message: error.message || "PayPal refund failed" // Thông điệp lỗi
      };
    }
  }
}

// Context: Bộ xử lý thanh toán
export class PaymentProcessor { // Lớp context để quản lý chiến lược thanh toán
  private strategy: PaymentStrategy; // Biến lưu chiến lược thanh toán hiện tại

  constructor(strategy: PaymentStrategy) { // Constructor nhận chiến lược ban đầu
    this.strategy = strategy; // Gán chiến lược được truyền vào
  }

  setStrategy(strategy: PaymentStrategy): void { // Phương thức thay đổi chiến lược
    this.strategy = strategy; // Cập nhật chiến lược mới
  }

  async processPayment(amount: number, currency: string, userData: any): Promise<PaymentResult> { // Phương thức xử lý thanh toán
    return this.strategy.pay(amount, currency, userData); // Gọi phương thức pay của chiến lược hiện tại
  }

  async processRefund(transactionId: string, amount: number): Promise<PaymentResult> { // Phương thức xử lý hoàn tiền
    return this.strategy.refund(transactionId, amount); // Gọi phương thức refund của chiến lược hiện tại
  }
}