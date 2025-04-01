// Triển khai Repository Pattern để truy cập dữ liệu
import mongoose from 'mongoose';
import { Booking, IBooking } from '../../models/booking.model'; // Nhập mô hình Booking và interface IBooking
import { SeatReservation, ISeatReservation } from '../../models/seat.reservation.model'; // Nhập mô hình SeatReservation và interface ISeatReservation

// Giao diện Repository
export interface IBookingRepository {
  findById(id: string): Promise<IBooking | null>; // Tìm đặt chỗ theo ID
  findByUserId(userId: string): Promise<IBooking[]>; // Tìm danh sách đặt chỗ theo ID người dùng
  create(bookingData: Partial<IBooking>): Promise<IBooking>; // Tạo một đặt chỗ mới
  update(id: string, bookingData: Partial<IBooking>): Promise<IBooking | null>; // Cập nhật thông tin đặt chỗ
  delete(id: string): Promise<boolean>; // Xóa một đặt chỗ
  getActiveBookingsBySeatId(seatId: string, showtimeId: string): Promise<IBooking[]>; // Lấy danh sách đặt chỗ đang hoạt động theo ID ghế và suất chiếu
  confirmBooking(id: string): Promise<IBooking | null>; // Xác nhận một đặt chỗ
  cancelBooking(id: string): Promise<IBooking | null>; // Hủy một đặt chỗ
}

// Triển khai cụ thể lớp Repository
export class BookingRepository implements IBookingRepository {
  // Tìm đặt chỗ theo ID
  async findById(id: string): Promise<IBooking | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid booking ID'); // Ném lỗi nếu ID không hợp lệ
    }

    return await Booking.findById(id) // Truy vấn đặt chỗ theo ID
      .populate('userId', 'username email phone') // Nạp thông tin người dùng (username, email, phone)
      .populate('showtimeId') // Nạp thông tin suất chiếu
      .populate('seats'); // Nạp thông tin ghế
  }

  // Tìm danh sách đặt chỗ theo ID người dùng
  async findByUserId(userId: string): Promise<IBooking[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) { // Kiểm tra tính hợp lệ của userId
      throw new Error('Invalid user ID'); // Ném lỗi nếu userId không hợp lệ
    }

    return await Booking.find({ userId }) // Truy vấn tất cả đặt chỗ của người dùng
      .populate('showtimeId') // Nạp thông tin suất chiếu
      .populate('seats') // Nạp thông tin ghế
      .sort({ bookedAt: -1 }); // Sắp xếp theo thời gian đặt giảm dần
  }

  // Tạo một đặt chỗ mới
  async create(bookingData: Partial<IBooking>): Promise<IBooking> {
    const session = await mongoose.startSession(); // Bắt đầu một session để quản lý transaction
    session.startTransaction(); // Bắt đầu transaction

    try {
      // Tạo bản ghi đặt chỗ
      const newBooking = new Booking(bookingData); // Khởi tạo đặt chỗ mới
      await newBooking.save({ session }); // Lưu vào cơ sở dữ liệu với session

      // Cập nhật trạng thái đặt ghế
      const seatUpdates = bookingData.seats?.map(seatId => // Duyệt qua danh sách ghế
        SeatReservation.updateOne(
          {
            showtimeId: bookingData.showtimeId, // Tìm ghế theo suất chiếu
            seatId: seatId // Tìm ghế theo ID
          },
          {
            status: 'reserved', // Cập nhật trạng thái thành "reserved"
            bookingId: newBooking._id, // Liên kết với đặt chỗ mới
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Đặt thời gian hết hạn 15 phút
          },
          { upsert: true, session } // Tạo mới nếu chưa tồn tại, dùng session
        )
      );

      if (seatUpdates) { // Nếu có cập nhật ghế
        await Promise.all(seatUpdates); // Chờ tất cả cập nhật hoàn tất
      }

      await session.commitTransaction(); // Xác nhận transaction
      return newBooking; // Trả về đặt chỗ mới
    } catch (error) {
      await session.abortTransaction(); // Hủy transaction nếu có lỗi
      throw error; // Ném lỗi
    } finally {
      session.endSession(); // Kết thúc session
    }
  }

  // Cập nhật thông tin đặt chỗ
  async update(id: string, bookingData: Partial<IBooking>): Promise<IBooking | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid booking ID'); // Ném lỗi nếu ID không hợp lệ
    }

    return await Booking.findByIdAndUpdate(
      id, // Tìm đặt chỗ theo ID
      { $set: bookingData }, // Cập nhật dữ liệu mới
      { new: true, runValidators: true } // Trả về bản ghi mới và chạy các validator
    );
  }

  // Xóa một đặt chỗ
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid booking ID'); // Ném lỗi nếu ID không hợp lệ
    }

    const session = await mongoose.startSession(); // Bắt đầu session
    session.startTransaction(); // Bắt đầu transaction

    try {
      const booking = await Booking.findById(id); // Tìm đặt chỗ cần xóa
      if (!booking) { // Nếu không tìm thấy
        return false; // Trả về false
      }

      await SeatReservation.updateMany(
        { bookingId: booking._id }, // Tìm các ghế liên quan đến đặt chỗ
        {
          status: 'available', // Cập nhật trạng thái ghế thành "available"
          $unset: { bookingId: 1, expiresAt: 1 } // Xóa liên kết bookingId và expiresAt
        },
        { session } // Dùng session
      );

      await Booking.deleteOne({ _id: id }, { session }); // Xóa đặt chỗ

      await session.commitTransaction(); // Xác nhận transaction
      return true; // Trả về true nếu thành công
    } catch (error) {
      await session.abortTransaction(); // Hủy transaction nếu có lỗi
      throw error; // Ném lỗi
    } finally {
      session.endSession(); // Kết thúc session
    }
  }

  // Lấy danh sách đặt chỗ đang hoạt động theo ID ghế và suất chiếu
  async getActiveBookingsBySeatId(seatId: string, showtimeId: string): Promise<IBooking[]> {
    if (!mongoose.Types.ObjectId.isValid(seatId) || !mongoose.Types.ObjectId.isValid(showtimeId)) { // Kiểm tra tính hợp lệ của seatId và showtimeId
      throw new Error('Invalid seat ID or showtime ID'); // Ném lỗi nếu không hợp lệ
    }

    const reservations = await SeatReservation.find({ // Tìm các đặt ghế
      seatId, // Theo ID ghế
      showtimeId, // Theo ID suất chiếu
      status: { $in: ['reserved', 'booked'] } // Chỉ lấy trạng thái "reserved" hoặc "booked"
    });

    const bookingIds = reservations.map((res: ISeatReservation) => res.bookingId).filter((id: mongoose.Types.ObjectId | undefined) => id !== undefined); // Lấy danh sách bookingId từ kết quả

    return await Booking.find({ // Truy vấn các đặt chỗ tương ứng
      _id: { $in: bookingIds }, // Theo danh sách bookingId
      bookingStatus: { $ne: 'cancelled' } // Loại trừ trạng thái "cancelled"
    });
  }

  // Xác nhận một đặt chỗ
  async confirmBooking(id: string): Promise<IBooking | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid booking ID'); // Ném lỗi nếu không hợp lệ
    }

    const session = await mongoose.startSession(); // Bắt đầu session
    session.startTransaction(); // Bắt đầu transaction

    try {
      const booking = await Booking.findByIdAndUpdate(
        id, // Tìm đặt chỗ theo ID
        {
          bookingStatus: 'confirmed', // Cập nhật trạng thái thành "confirmed"
          paymentStatus: 'completed' // Cập nhật thanh toán thành "completed"
        },
        { new: true, session } // Trả về bản ghi mới, dùng session
      );

      if (!booking) { // Nếu không tìm thấy đặt chỗ
        await session.abortTransaction(); // Hủy transaction
        return null; // Trả về null
      }

      await SeatReservation.updateMany(
        { bookingId: booking._id }, // Tìm các ghế liên quan
        {
          status: 'booked', // Cập nhật trạng thái thành "booked"
          $unset: { expiresAt: 1 } // Xóa thời gian hết hạn
        },
        { session } // Dùng session
      );

      await session.commitTransaction(); // Xác nhận transaction
      return booking; // Trả về đặt chỗ đã xác nhận
    } catch (error) {
      await session.abortTransaction(); // Hủy transaction nếu có lỗi
      throw error; // Ném lỗi
    } finally {
      session.endSession(); // Kết thúc session
    }
  }

  // Hủy một đặt chỗ
  async cancelBooking(id: string): Promise<IBooking | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid booking ID'); // Ném lỗi nếu không hợp lệ
    }

    const session = await mongoose.startSession(); // Bắt đầu session
    session.startTransaction(); // Bắt đầu transaction

    try {
      const booking = await Booking.findByIdAndUpdate(
        id, // Tìm đặt chỗ theo ID
        { bookingStatus: 'cancelled' }, // Cập nhật trạng thái thành "cancelled"
        { new: true, session } // Trả về bản ghi mới, dùng session
      );

      if (!booking) { // Nếu không tìm thấy đặt chỗ
        await session.abortTransaction(); // Hủy transaction
        return null; // Trả về null
      }

      await SeatReservation.updateMany(
        { bookingId: booking._id }, // Tìm các ghế liên quan
        {
          status: 'available', // Cập nhật trạng thái thành "available"
          $unset: { bookingId: 1, expiresAt: 1 } // Xóa liên kết bookingId và expiresAt
        },
        { session } // Dùng session
      );

      await session.commitTransaction(); // Xác nhận transaction
      return booking; // Trả về đặt chỗ đã hủy
    } catch (error) {
      await session.abortTransaction(); // Hủy transaction nếu có lỗi
      throw error; // Ném lỗi
    } finally {
      session.endSession(); // Kết thúc session
    }
  }
}