import { IShowtime } from '../models/showtime.model';
import { ShowtimeRepository } from '../patterns/repository/ShowtimeRepository';
import { MovieRepository } from '../patterns/repository/MovieRepository';
import { Seat, ISeat } from '../models/seat.model'; 
import socketService from '../socket/socket.service';

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
    if (!showtimeData.movieId || !showtimeData.screenId || 
        !showtimeData.startTime || !showtimeData.price) {
      throw new Error('Missing required showtime information');
    }

    const movie = await this.movieRepository.findById(showtimeData.movieId.toString());
    if (!movie) {
      throw new Error('Movie not found');
    }
    if (!movie.isActive) {
      throw new Error('Cannot create showtime for inactive movie');
    }

    const startTime = new Date(showtimeData.startTime);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + movie.duration + 30); 
    
    showtimeData.endTime = endTime;

    const newShowtime = await this.showtimeRepository.create(showtimeData);

    if (newShowtime._id) {
      await this.initializeSeatAvailability(newShowtime._id.toString(), showtimeData.screenId.toString());
    }

    return newShowtime;
  }

  async updateShowtime(id: string, showtimeData: Partial<IShowtime>): Promise<IShowtime | null> {
    const existingShowtime = await this.showtimeRepository.findById(id);
    if (!existingShowtime) {
      throw new Error('Showtime not found');
    }

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
      const movie = await this.movieRepository.findById(existingShowtime.movieId.toString());
      if (movie) {
        const startTime = new Date(showtimeData.startTime);
        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + movie.duration + 30);
        
        showtimeData.endTime = endTime;
      }
    }

    return await this.showtimeRepository.update(id, showtimeData);
  }

  async deleteShowtime(id: string): Promise<boolean> {
    const bookedSeats = await Seat.find({ 
      showtimeId: id,
      status: { $in: ['reserved', 'booked'] }
    });

    if (bookedSeats.length > 0) {
      await this.showtimeRepository.update(id, { isActive: false });
      return true;
    }

    return await this.showtimeRepository.delete(id);
  }

  async getShowtimeSeats(showtimeId: string): Promise<any[]> {
    const showtime = await this.showtimeRepository.findById(showtimeId);
    if (!showtime) {
      throw new Error('Showtime not found');
    }

    const seats = await Seat.find({ 
      screenId: showtime.screenId,
      showtimeId: showtimeId,
      isActive: true 
    }).sort({ row: 1, seatNumber: 1 });

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

    return Object.keys(seatsByRow)
      .sort()
      .map(row => ({
        row,
        seats: seatsByRow[row].sort((a, b) => a.number - b.number)
      }));
  }

  private async initializeSeatAvailability(showtimeId: string, screenId: string): Promise<void> {
    const screenSeats = await Seat.find({ screenId, isActive: true });

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

    if (showtimeSeats.length > 0) {
      await Seat.insertMany(showtimeSeats);
    }
  }
}