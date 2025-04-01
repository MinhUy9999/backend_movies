// Service Layer Pattern for Showtime Business Logic

import { IShowtime } from '../models/showtime.model';
import { ShowtimeRepository } from '../patterns/repository/ShowtimeRepository';
import { MovieRepository } from '../patterns/repository/MovieRepository';
import { ISeatReservation, SeatReservation } from '../models/seat.reservation.model';
import { Seat } from '../models/seat.model';

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

    // Initialize seat reservations for this showtime
    if (newShowtime._id) {
      await this.initializeSeatReservations(newShowtime._id.toString(), showtimeData.screenId.toString());
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

    return await this.showtimeRepository.update(id, showtimeData);
  }

  async deleteShowtime(id: string): Promise<boolean> {
    // Check if there are bookings for this showtime
    const reservations = await SeatReservation.find({ 
      showtimeId: id,
      status: { $in: ['reserved', 'booked'] }
    });

    if (reservations.length > 0) {
      // If there are bookings, don't allow deletion - just mark inactive
      await this.showtimeRepository.update(id, { isActive: false });
      return true;
    }

    // Otherwise actually delete
    return await this.showtimeRepository.delete(id);
  }

  async getShowtimeSeats(showtimeId: string): Promise<any[]> {
    // Get the showtime
    const showtime = await this.showtimeRepository.findById(showtimeId);
    if (!showtime) {
      throw new Error('Showtime not found');
    }

    // Get all seats for the screen
    const seats = await Seat.find({ 
      screenId: showtime.screenId,
      isActive: true 
    }).sort({ row: 1, seatNumber: 1 });

    // Get reservation status for each seat
    const seatReservations = await SeatReservation.find({
      showtimeId: showtimeId
    });

    // Create a map of seat ID to reservation status
    const reservationMap: { [key: string]: string } = {};
    seatReservations.forEach((reservation: ISeatReservation) => {
      if (reservation.seatId) {
        reservationMap[reservation.seatId.toString()] = reservation.status;
      }
    });

    // Organize seats by row
    const seatsByRow: { [key: string]: any[] } = {};
    seats.forEach(seat => {
      if (!seatsByRow[seat.row]) {
        seatsByRow[seat.row] = [];
      }
      
      const seatId = seat._id ? seat._id.toString() : '';
      
      seatsByRow[seat.row].push({
        id: seat._id,
        row: seat.row,
        number: seat.seatNumber,
        type: seat.seatType,
        price: showtime.price[seat.seatType as keyof typeof showtime.price],
        status: reservationMap[seatId] || 'available'
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

  // Helper method to initialize seat reservations for a new showtime
  private async initializeSeatReservations(showtimeId: string, screenId: string): Promise<void> {
    // Get all seats for the screen
    const seats = await Seat.find({ screenId, isActive: true });

    // Create initial reservations (all available)
    const reservations = seats.map(seat => ({
      showtimeId,
      seatId: seat._id,
      status: 'available' as const
    }));

    // Bulk insert all reservations
    if (reservations.length > 0) {
      await SeatReservation.insertMany(reservations);
    }
  }
}
