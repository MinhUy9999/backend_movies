// Triển khai Repository Pattern để truy cập dữ liệu phim
import mongoose from 'mongoose'; // Nhập thư viện mongoose để tương tác với MongoDB
import { Movie, IMovie } from '../../models/movie.model'; // Nhập mô hình Movie và interface IMovie từ file mô hình

// Giao diện Repository cho phim
export interface IMovieRepository {
  findById(id: string): Promise<IMovie | null>; // Tìm phim theo ID
  findAll(filters?: any): Promise<IMovie[]>; // Lấy tất cả phim với bộ lọc tùy chọn
  findByGenre(genre: string): Promise<IMovie[]>; // Tìm phim theo thể loại
  findActiveMovies(): Promise<IMovie[]>; // Lấy danh sách phim đang hoạt động
  findUpcomingMovies(): Promise<IMovie[]>; // Lấy danh sách phim sắp chiếu
  create(movieData: Partial<IMovie>): Promise<IMovie>; // Tạo một phim mới
  update(id: string, movieData: Partial<IMovie>): Promise<IMovie | null>; // Cập nhật thông tin phim
  delete(id: string): Promise<boolean>; // Xóa một phim
  searchMovies(query: string): Promise<IMovie[]>; // Tìm kiếm phim theo từ khóa
}

// Triển khai cụ thể lớp Repository cho phim
export class MovieRepository implements IMovieRepository {
  // Tìm phim theo ID
  async findById(id: string): Promise<IMovie | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid movie ID'); // Ném lỗi nếu ID không hợp lệ
    }

    return await Movie.findById(id); // Truy vấn phim theo ID và trả về kết quả
  }

  // Lấy tất cả phim với bộ lọc tùy chọn
  async findAll(filters: any = {}): Promise<IMovie[]> {
    return await Movie.find(filters) // Truy vấn phim với bộ lọc (mặc định là rỗng)
      .sort({ releaseDate: -1 }); // Sắp xếp theo ngày phát hành giảm dần
  }

  // Tìm phim theo thể loại
  async findByGenre(genre: string): Promise<IMovie[]> {
    return await Movie.find({
      genre: { $regex: new RegExp(genre, 'i') }, // Tìm thể loại khớp với từ khóa (không phân biệt hoa thường)
      isActive: true // Chỉ lấy phim đang hoạt động
    })
      .sort({ releaseDate: -1 }); // Sắp xếp theo ngày phát hành giảm dần
  }

  // Lấy danh sách phim đang hoạt động
  async findActiveMovies(): Promise<IMovie[]> {
    const now = new Date(); // Lấy thời điểm hiện tại
    return await Movie.find({
      isActive: true, // Chỉ lấy phim đang hoạt động
      releaseDate: { $lte: now }, // Ngày phát hành nhỏ hơn hoặc bằng hiện tại
      endDate: { $gte: now } // Ngày kết thúc lớn hơn hoặc bằng hiện tại
    })
      .sort({ releaseDate: -1 }); // Sắp xếp theo ngày phát hành giảm dần
  }

  // Lấy danh sách phim sắp chiếu
  async findUpcomingMovies(): Promise<IMovie[]> {
    const now = new Date(); // Lấy thời điểm hiện tại
    return await Movie.find({
      isActive: true, // Chỉ lấy phim đang hoạt động
      releaseDate: { $gt: now } // Ngày phát hành lớn hơn hiện tại
    })
      .sort({ releaseDate: 1 }); // Sắp xếp theo ngày phát hành tăng dần
  }

  // Tạo một phim mới
  async create(movieData: Partial<IMovie>): Promise<IMovie> {
    const newMovie = new Movie(movieData); // Khởi tạo phim mới từ dữ liệu đầu vào
    return await newMovie.save(); // Lưu phim vào cơ sở dữ liệu và trả về kết quả
  }

  // Cập nhật thông tin phim
  async update(id: string, movieData: Partial<IMovie>): Promise<IMovie | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid movie ID'); // Ném lỗi nếu ID không hợp lệ
    }

    return await Movie.findByIdAndUpdate(
      id, // Tìm phim theo ID
      { $set: movieData }, // Cập nhật dữ liệu mới
      { new: true, runValidators: true } // Trả về bản ghi mới và chạy các validator
    );
  }

  // Xóa một phim
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) { // Kiểm tra tính hợp lệ của ID
      throw new Error('Invalid movie ID'); // Ném lỗi nếu ID không hợp lệ
    }

    const result = await Movie.deleteOne({ _id: id }); // Xóa phim theo ID
    return result.deletedCount > 0; // Trả về true nếu xóa thành công, false nếu không
  }

  // Tìm kiếm phim theo từ khóa
  async searchMovies(query: string): Promise<IMovie[]> {
    const searchRegex = new RegExp(query, 'i'); // Tạo biểu thức chính quy không phân biệt hoa thường từ từ khóa

    return await Movie.find({
      $or: [ // Tìm kiếm trên nhiều trường với điều kiện OR
        { title: { $regex: searchRegex } }, // Tìm trong tiêu đề
        { description: { $regex: searchRegex } }, // Tìm trong mô tả
        { genre: { $regex: searchRegex } }, // Tìm trong thể loại
        { director: { $regex: searchRegex } }, // Tìm trong đạo diễn
        { cast: { $regex: searchRegex } } // Tìm trong dàn diễn viên
      ],
      isActive: true // Chỉ lấy phim đang hoạt động
    })
      .sort({ releaseDate: -1 }); // Sắp xếp theo ngày phát hành giảm dần
  }
}