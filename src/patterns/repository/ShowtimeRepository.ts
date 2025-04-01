// Triển khai Repository Pattern để truy cập dữ liệu suất chiếu
import mongoose from 'mongoose'; // Nhập thư viện mongoose để tương tác với MongoDB
import { Showtime, IShowtime } from '../../models/showtime.model'; // Nhập mô hình Showtime và interface IShowtime
import { Theater } from '../../models/theater.model'; // Nhập mô hình Theater
import { Screen } from '../../models/screen.model'; // Nhập mô hình Screen

// Giao diện Repository cho suất chiếu
export interface IShowtimeRepository {
  findById(id: string): Promise<IShowtime | null>; // Tìm suất chiếu theo ID
  findAll(filters?: any): Promise<IShowtime[]>; // Lấy tất cả suất chiếu với bộ lọc tùy chọn
  findByMovie(movieId: string): Promise<IShowtime[]>; // Tìm suất chiếu theo ID phim
  findByTheater(theaterId: string): Promise<IShowtime[]>; // Tìm suất chiếu theo ID rạp
  findByDateRange(startDate: Date, endDate: Date): Promise<IShowtime[]>; // Tìm suất chiếu trong khoảng thời gian
  findAvailableShowtimes(movieId: string, date: Date): Promise<IShowtime[]>; // Tìm suất chiếu khả dụng theo phim và ngày
  create(showtimeData: Partial<IShowtime>): Promise<IShowtime>; // Tạo một suất chiếu mới
  update(id: string, showtimeData: Partial<IShowtime>): Promise<IShowtime | null>; // Cập nhật thông tin suất chiếu
  delete(id: string): Promise<boolean>; // Xóa một suất chiếu
}

// Triển khai cụ thể lớp Repository cho suất chiếu
export class ShowtimeRepository implements IShowtimeRepository {
  // Tìm suất chiếu theo ID
  async findById(id: string): Promise<IShowtime | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid showtime ID'); // Ném lỗi nếu ID không hợp lệ
    }

    return await Showtime.findById(id) // Truy vấn suất chiếu theo ID
      .populate('movieId') // Nạp thông tin phim
      .populate({ // Nạp thông tin màn hình và rạp liên quan
        path: 'screenId',
        populate: {
          path: 'theaterId',
          model: 'Theater'
        }
      });
  }

  // Lấy tất cả suất chiếu với bộ lọc tùy chọn
  async findAll(filters: any = {}): Promise<IShowtime[]> {
    return await Showtime.find(filters) // Truy vấn suất chiếu với bộ lọc (mặc định là rỗng)
      .populate('movieId') // Nạp thông tin phim
      .populate({ // Nạp thông tin màn hình và rạp liên quan
        path: 'screenId',
        populate: {
          path: 'theaterId',
          model: 'Theater'
        }
      })
      .sort({ startTime: 1 }); // Sắp xếp theo thời gian bắt đầu tăng dần
  }

  // Tìm suất chiếu theo ID phim
  async findByMovie(movieId: string): Promise<IShowtime[]> {
    if (!mongoose.Types.ObjectId.isValid(movieId)) { // Kiểm tra tính hợp lệ của movieId
      throw new Error('Invalid movie ID'); // Ném lỗi nếu movieId không hợp lệ
    }

    return await Showtime.find({
      movieId, // Tìm theo ID phim
      startTime: { $gte: new Date() }, // Chỉ lấy suất chiếu từ hiện tại trở đi
      isActive: true // Chỉ lấy suất chiếu đang hoạt động
    })
      .populate('movieId') // Nạp thông tin phim
      .populate({ // Nạp thông tin màn hình và rạp liên quan
        path: 'screenId',
        populate: {
          path: 'theaterId',
          model: 'Theater'
        }
      })
      .sort({ startTime: 1 }); // Sắp xếp theo thời gian bắt đầu tăng dần
  }

  // Tìm suất chiếu theo ID rạp
  async findByTheater(theaterId: string): Promise<IShowtime[]> {
    if (!mongoose.Types.ObjectId.isValid(theaterId)) { // Kiểm tra tính hợp lệ của theaterId
      throw new Error('Invalid theater ID'); // Ném lỗi nếu theaterId không hợp lệ
    }

    const screens = await Screen.find({ theaterId }); // Tìm tất cả màn hình trong rạp này
    const screenIds = screens.map(screen => screen._id); // Lấy danh sách ID màn hình

    return await Showtime.find({
      screenId: { $in: screenIds }, // Tìm suất chiếu theo danh sách ID màn hình
      startTime: { $gte: new Date() }, // Chỉ lấy suất chiếu từ hiện tại trở đi
      isActive: true // Chỉ lấy suất chiếu đang hoạt động
    })
      .populate('movieId') // Nạp thông tin phim
      .populate({ // Nạp thông tin màn hình và rạp liên quan
        path: 'screenId',
        populate: {
          path: 'theaterId',
          model: 'Theater'
        }
      })
      .sort({ startTime: 1 }); // Sắp xếp theo thời gian bắt đầu tăng dần
  }

  // Tìm suất chiếu trong khoảng thời gian
  async findByDateRange(startDate: Date, endDate: Date): Promise<IShowtime[]> {
    return await Showtime.find({
      startTime: { $gte: startDate, $lte: endDate }, // Tìm suất chiếu trong khoảng từ startDate đến endDate
      isActive: true // Chỉ lấy suất chiếu đang hoạt động
    })
      .populate('movieId') // Nạp thông tin phim
      .populate({ // Nạp thông tin màn hình và rạp liên quan
        path: 'screenId',
        populate: {
          path: 'theaterId',
          model: 'Theater'
        }
      })
      .sort({ startTime: 1 }); // Sắp xếp theo thời gian bắt đầu tăng dần
  }

  // Tìm suất chiếu khả dụng theo phim và ngày
  async findAvailableShowtimes(movieId: string, date: Date): Promise<IShowtime[]> {
    if (!mongoose.Types.ObjectId.isValid(movieId)) { // Kiểm tra tính hợp lệ của movieId
      throw new Error('Invalid movie ID'); // Ném lỗi nếu movieId không hợp lệ
    }

    const startOfDay = new Date(date); // Tạo thời điểm bắt đầu ngày (00:00:00)
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date); // Tạo thời điểm kết thúc ngày (23:59:59)
    endOfDay.setHours(23, 59, 59, 999);

    return await Showtime.find({
      movieId, // Tìm theo ID phim
      startTime: { $gte: startOfDay, $lte: endOfDay }, // Tìm suất chiếu trong ngày được chỉ định
      isActive: true // Chỉ lấy suất chiếu đang hoạt động
    })
      .populate('movieId') // Nạp thông tin phim
      .populate({ // Nạp thông tin màn hình và rạp liên quan
        path: 'screenId',
        populate: {
          path: 'theaterId',
          model: 'Theater'
        }
      })
      .sort({ startTime: 1 }); // Sắp xếp theo thời gian bắt đầu tăng dần
  }

  // Tạo một suất chiếu mới
  async create(showtimeData: Partial<IShowtime>): Promise<IShowtime> {
    // Kiểm tra: Không cho phép suất chiếu trùng lặp trên cùng màn hình
    if (showtimeData.screenId && showtimeData.startTime && showtimeData.endTime) {
      const overlappingShowtime = await Showtime.findOne({
        screenId: showtimeData.screenId, // Tìm suất chiếu trên cùng màn hình
        $or: [
          {
            startTime: { $lt: showtimeData.endTime }, // Thời gian bắt đầu trước thời gian kết thúc mới
            endTime: { $gt: showtimeData.startTime } // Thời gian kết thúc sau thời gian bắt đầu mới
          }
        ],
        isActive: true // Chỉ kiểm tra suất chiếu đang hoạt động
      });

      if (overlappingShowtime) { // Nếu có suất chiếu trùng
        throw new Error('There is an overlapping showtime for this screen'); // Ném lỗi
      }
    }

    const newShowtime = new Showtime(showtimeData); // Tạo suất chiếu mới
    return await newShowtime.save(); // Lưu vào cơ sở dữ liệu và trả về
  }

  // Cập nhật thông tin suất chiếu
  async update(id: string, showtimeData: Partial<IShowtime>): Promise<IShowtime | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid showtime ID'); // Ném lỗi nếu ID không hợp lệ
    }

    // Kiểm tra: Không cho phép cập nhật gây trùng lặp suất chiếu
    if (showtimeData.screenId && showtimeData.startTime && showtimeData.endTime) {
      const overlappingShowtime = await Showtime.findOne({
        _id: { $ne: id }, // Loại trừ suất chiếu hiện tại
        screenId: showtimeData.screenId, // Tìm trên cùng màn hình
        $or: [
          {
            startTime: { $lt: showtimeData.endTime }, // Thời gian bắt đầu trước thời gian kết thúc mới
            endTime: { $gt: showtimeData.startTime } // Thời gian kết thúc sau thời gian bắt đầu mới
          }
        ],
        isActive: true // Chỉ kiểm tra suất chiếu đang hoạt động
      });

      if (overlappingShowtime) { // Nếu có suất chiếu trùng
        throw new Error('There is an overlapping showtime for this screen'); // Ném lỗi
      }
    }

    return await Showtime.findByIdAndUpdate(
      id, // Tìm suất chiếu theo ID
      { $set: showtimeData }, // Cập nhật dữ liệu mới
      { new: true, runValidators: true } // Trả về bản ghi mới và chạy các validator
    );
  }

  // Xóa một suất chiếu
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid showtime ID'); // Ném lỗi nếu ID không hợp lệ
    }

    // Xóa mềm - chỉ đánh dấu là không hoạt động
    const result = await Showtime.updateOne(
      { _id: id }, // Tìm suất chiếu theo ID
      { $set: { isActive: false } } // Cập nhật trạng thái thành không hoạt động
    );

    return result.modifiedCount > 0; // Trả về true nếu cập nhật thành công, false nếu không
  }
}