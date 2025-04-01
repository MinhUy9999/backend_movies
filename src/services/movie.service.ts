// Service Layer Pattern for Movie Business Logic

import { IMovie } from '../models/movie.model';
import { MovieRepository } from '../patterns/repository/MovieRepository';
import { ShowtimeRepository } from '../patterns/repository/ShowtimeRepository';

export class MovieService {
  private movieRepository: MovieRepository;
  private showtimeRepository: ShowtimeRepository;

  constructor() {
    this.movieRepository = new MovieRepository();
    this.showtimeRepository = new ShowtimeRepository();
  }

  async getAllMovies(includeInactive: boolean = false): Promise<IMovie[]> {
    const filters = includeInactive ? {} : { isActive: true };
    return await this.movieRepository.findAll(filters);
  }

  async getMovieById(id: string): Promise<IMovie | null> {
    return await this.movieRepository.findById(id);
  }

  async getActiveMovies(): Promise<IMovie[]> {
    return await this.movieRepository.findActiveMovies();
  }

  async getUpcomingMovies(): Promise<IMovie[]> {
    return await this.movieRepository.findUpcomingMovies();
  }

  async getMoviesByGenre(genre: string): Promise<IMovie[]> {
    return await this.movieRepository.findByGenre(genre);
  }

  async searchMovies(query: string): Promise<IMovie[]> {
    if (!query || query.trim() === '') {
      return await this.getActiveMovies();
    }
    return await this.movieRepository.searchMovies(query);
  }

  async createMovie(movieData: Partial<IMovie>): Promise<IMovie> {
    // Validate required fields
    if (!movieData.title || !movieData.description || !movieData.duration || 
        !movieData.genre || !movieData.language || !movieData.releaseDate || 
        !movieData.endDate || !movieData.director) {
      throw new Error('Missing required movie information');
    }

    // Additional validation
    if (movieData.duration <= 0) {
      throw new Error('Movie duration must be positive');
    }

    if (new Date(movieData.releaseDate) > new Date(movieData.endDate)) {
      throw new Error('Release date cannot be after end date');
    }

    return await this.movieRepository.create(movieData);
  }

  async updateMovie(id: string, movieData: Partial<IMovie>): Promise<IMovie | null> {
    // Validate movie exists
    const existingMovie = await this.movieRepository.findById(id);
    if (!existingMovie) {
      throw new Error('Movie not found');
    }

    // Validate dates if provided
    if (movieData.releaseDate && movieData.endDate && 
        new Date(movieData.releaseDate) > new Date(movieData.endDate)) {
      throw new Error('Release date cannot be after end date');
    }

    return await this.movieRepository.update(id, movieData);
  }

  async deleteMovie(id: string): Promise<boolean> {
    // Check if movie has associated showtimes
    const showtimes = await this.showtimeRepository.findByMovie(id);
    
    // For existing showtimes, we can either:
    // 1. Prevent deletion and throw an error (strict approach)
    // 2. Mark movie as inactive but don't delete (soft delete approach)
    // 3. Delete the movie and all associated showtimes (cascade delete approach)
    
    // For this implementation, we'll use approach #2 (soft delete)
    if (showtimes.length > 0) {
      // Just mark as inactive instead of deleting
      await this.movieRepository.update(id, { isActive: false });
      return true;
    } else {
      // No showtimes, can safely delete
      return await this.movieRepository.delete(id);
    }
  }

  async getMovieShowtimes(movieId: string, date?: Date): Promise<any[]> {
    if (!movieId) {
      throw new Error('Movie ID is required');
    }

    const searchDate = date || new Date();
    
    // Get all showtimes for this movie on the specified date
    const showtimes = await this.showtimeRepository.findAvailableShowtimes(movieId, searchDate);
    
    // Format and group showtimes by theater
    const groupedShowtimes: any = {};
    
    for (const showtime of showtimes) {
      // Extract theater info from populated data
      const screenData = showtime.screenId as any;
      const theaterData = screenData.theaterId;
      const theaterId = theaterData._id.toString();
      
      if (!groupedShowtimes[theaterId]) {
        groupedShowtimes[theaterId] = {
          theaterId: theaterId,
          theaterName: theaterData.name,
          location: theaterData.location,
          showtimes: []
        };
      }
      
      groupedShowtimes[theaterId].showtimes.push({
        id: showtime._id,
        screenName: screenData.name,
        screenType: screenData.screenType,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        prices: showtime.price
      });
    }
    
    // Convert to array and sort theaters by name
    return Object.values(groupedShowtimes).sort((a: any, b: any) => 
      a.theaterName.localeCompare(b.theaterName)
    );
  }
}
