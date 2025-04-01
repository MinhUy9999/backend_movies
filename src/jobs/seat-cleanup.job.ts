// src/jobs/seat-cleanup.job.ts
import { SeatService } from '../services/seat.service';

/**
 * Công việc dọn dẹp ghế ngồi hết hạn.
 * Giải phóng các ghế được đặt tạm thời nhưng đã quá thời gian hết hạn (15 phút).
 */
export class SeatCleanupJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 60000; // Chạy mỗi 1 phút

  /**
   * Bắt đầu công việc dọn dẹp tự động
   */
  start(): void {
    if (this.intervalId) {
      console.log('Seat cleanup job is already running');
      return;
    }

    console.log('Starting seat cleanup job to run every minute');
    
    this.intervalId = setInterval(async () => {
      try {
        await this.cleanupExpiredSeats();
      } catch (error) {
        console.error('Error in seat cleanup job:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Dừng công việc dọn dẹp
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Seat cleanup job stopped');
    }
  }

  /**
   * Thực hiện dọn dẹp các ghế đã hết hạn
   */
  private async cleanupExpiredSeats(): Promise<void> {
    console.log(`Running seat cleanup job at ${new Date().toISOString()}`);
    await SeatService.releaseExpiredSeats();
  }

  /**
   * Chạy công việc dọn dẹp ngay lập tức một lần
   */
  async runNow(): Promise<void> {
    console.log(`Running immediate seat cleanup at ${new Date().toISOString()}`);
    await SeatService.releaseExpiredSeats();
  }
}

// Export singleton instance
export const seatCleanupJob = new SeatCleanupJob();