// Service Layer Pattern for Showtime Business Logic

import { IShowtime } from '../models/showtime.model';
import { ShowtimeRepository } from '../patterns/repository/ShowtimeRepository';
import { MovieRepository } from '../patterns/repository/MovieRepository';
import { Seat, ISeat } from '../models/seat.model';
import { webSocketManager } from '../patterns/singleton/WebSocketManager'; // Import WebSocketManager

export class ShowtimeService {
  private showtimeRepository: ShowtimeRepository;
  private movieRepository: MovieRepository;

  constructor() {
    this.showtimeRepository = new ShowtimeRepository();
    this.movieRepository = new MovieRepository();
  }

  async getAllShowtimes(date?: Date): Promise<IShowtime[]> {
    if (date) {
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      return await this.showtimeRepository.findByDateRange(date, endDate);
    }
    
    return await this.showtimeRepository.findAll({ isActive: true });
  }

  async getShowtimeById(id: string): Promise<IShowtime | null> {
    return await this.showtimeRepository.findById(id);
  }

  async getShowtimesByMovie(movieId: string): Promise<IShowtime[]> {
    return await this.showtimeRepository.findByMovie(movieId);
  }

  async getShowtimesByTheater(theaterId: string): Promise<IShowtime[]> {
    return await this.showtimeRepository.findByTheater(theaterId);
  }

  async createShowtime(showtimeData: Partial<IShowtime>): Promise<IShowtime> {
    // Validate required fields
    if (!showtimeData.movieId || !showtimeData.screenId || 
        !showtimeData.startTime || !showtimeData.price) {
      throw new Error('Missing required showtime information');
    }

    // Validate movie exists and is active
    const movie = await this.movieRepository.findById(showtimeData.movieId.toString());
    if (!movie) {
      throw new Error('Movie not found');
    }
    if (!movie.isActive) {
      throw new Error('Cannot create showtime for inactive movie');
    }

    // Calculate end time based on movie duration
    const startTime = new Date(showtimeData.startTime);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + movie.duration + 30); // Add 30 minutes for ads/trailers/cleaning
    
    showtimeData.endTime = endTime;

    // Create the showtime
    const newShowtime = await this.showtimeRepository.create(showtimeData);

    // Initialize seat availability for this showtime
    if (newShowtime._id) {
      await this.initializeSeatAvailability(newShowtime._id.toString(), showtimeData.screenId.toString());
      
      // Thông báo qua WebSocket về suất chiếu mới
      const showtimeInfo = {
        id: newShowtime._id,
        movieId: newShowtime.movieId,
        screenId: newShowtime.screenId,
        startTime: newShowtime.startTime,
        endTime: newShowtime.endTime,
        price: newShowtime.price
      };
      webSocketManager.notifyShowtimeUpdated(newShowtime._id.toString(), showtimeInfo);
    }

    return newShowtime;
  }

  async updateShowtime(id: string, showtimeData: Partial<IShowtime>): Promise<IShowtime | null> {
    // Validate showtime exists
    const existingShowtime = await this.showtimeRepository.findById(id);
    if (!existingShowtime) {
      throw new Error('Showtime not found');
    }

    // If updating the movie, recalculate end time
    if (showtimeData.movieId) {
      const movie = await this.movieRepository.findById(showtimeData.movieId.toString());
      if (!movie) {
        throw new Error('Movie not found');
      }
      
      const startTime = showtimeData.startTime 
        ? new Date(showtimeData.startTime) 
        : existingShowtime.startTime;
      
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + movie.duration + 30);
      
      showtimeData.endTime = endTime;
    } else if (showtimeData.startTime) {
      // If just updating start time, recalculate end time based on existing movie
      const movie = await this.movieRepository.findById(existingShowtime.movieId.toString());
      if (movie) {
        const startTime = new Date(showtimeData.startTime);
        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + movie.duration + 30);
        
        showtimeData.endTime = endTime;
      }
    }

    const updatedShowtime = await this.showtimeRepository.update(id, showtimeData);
    
    // Nếu cập nhật thành công, thông báo qua WebSocket
    if (updatedShowtime) {
      const showtimeInfo = {
        id: updatedShowtime._id,
        movieId: updatedShowtime.movieId,
        screenId: updatedShowtime.screenId,
        startTime: updatedShowtime.startTime,
        endTime: updatedShowtime.endTime,
        price: updatedShowtime.price,
        isActive: updatedShowtime.isActive
      };
      webSocketManager.notifyShowtimeUpdated(id, showtimeInfo);
    }

    return updatedShowtime;
  }

  async deleteShowtime(id: string): Promise<boolean> {
    // Check if there are bookings for this showtime
    const bookedSeats = await Seat.find({ 
      showtimeId: id,
      status: { $in: ['reserved', 'booked'] }
    });

    if (bookedSeats.length > 0) {
      // If there are bookings, don't allow deletion - just mark inactive
      const updated = await this.showtimeRepository.update(id, { isActive: false });
      
      // Thông báo qua WebSocket
      if (updated) {
        webSocketManager.notifyShowtimeUpdated(id, {
          id: updated._id,
          isActive: false,
          message: "Showtime has been deactivated"
        });
      }
      
      return true;
    }

    // Otherwise actually delete
    const result = await this.showtimeRepository.delete(id);
    
    // Thông báo qua WebSocket nếu xóa thành công
    if (result) {
      webSocketManager.notifyShowtimeUpdated(id, {
        id: id,
        deleted: true,
        message: "Showtime has been deleted"
      });
    }
    
    return result;
  }

  async getShowtimeSeats(showtimeId: string): Promise<any[]> {
    // Get the showtime
    const showtime = await this.showtimeRepository.findById(showtimeId);
    if (!showtime) {
      throw new Error('Showtime not found');
    }

    // Get all seats for the screen with their status for this showtime
    const seats = await Seat.find({ 
      screenId: showtime.screenId,
      showtimeId: showtimeId,
      isActive: true 
    }).sort({ row: 1, seatNumber: 1 });

    // Organize seats by row
    const seatsByRow: { [key: string]: any[] } = {};
    seats.forEach(seat => {
      if (!seatsByRow[seat.row]) {
        seatsByRow[seat.row] = [];
      }
      
      seatsByRow[seat.row].push({
        id: seat._id,
        row: seat.row,
        number: seat.seatNumber,
        type: seat.seatType,
        price: showtime.price[seat.seatType as keyof typeof showtime.price],
        status: seat.status || 'available'
      });
    });

    // Convert to array and sort by row
    return Object.keys(seatsByRow)
      .sort()
      .map(row => ({
        row,
        seats: seatsByRow[row].sort((a, b) => a.number - b.number)
      }));
  }

  // Helper method to initialize seat availability for a new showtime
  private async initializeSeatAvailability(showtimeId: string, screenId: string): Promise<void> {
    // Get all seats for the screen
    const screenSeats = await Seat.find({ screenId, isActive: true });

    // Create copies of these seats for this specific showtime
    const showtimeSeats = screenSeats.map(screenSeat => {
      return {
        screenId: screenSeat.screenId,
        row: screenSeat.row,
        seatNumber: screenSeat.seatNumber,
        seatType: screenSeat.seatType,
        isActive: true,
        showtimeId: showtimeId,
        status: 'available'
      };
    });

    // Bulk insert all seats for this showtime
    if (showtimeSeats.length > 0) {
      await Seat.insertMany(showtimeSeats);
    }
  }
}