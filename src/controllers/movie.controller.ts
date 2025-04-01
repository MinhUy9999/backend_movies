import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { MovieService } from "../services/movie.service";
import { uploadMovieFiles } from "../middlewares/multerConfig";
import { responseSend } from "../config/response"; 
import { CloudinaryService } from "../services/cloudinary.service";

const movieService = new MovieService();

export class MovieController {
  static async getAllMovies(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const movies = await movieService.getAllMovies(includeInactive);
      responseSend(res, { movies }, "Movies fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching movies:", error.message);
      responseSend(res, null, error.message || "Error fetching movies", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async getMovieById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const movie = await movieService.getMovieById(id);

      if (!movie) {
        responseSend(res, null, "Movie not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }

      responseSend(res, { movie }, "Movie fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching movie:", error.message);
      responseSend(res, null, error.message || "Error fetching movie", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async getActiveMovies(req: Request, res: Response): Promise<void> {
    try {
      const movies = await movieService.getActiveMovies();
      responseSend(res, { movies }, "Active movies fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching active movies:", error.message);
      responseSend(res, null, error.message || "Error fetching active movies", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async getUpcomingMovies(req: Request, res: Response): Promise<void> {
    try {
      const movies = await movieService.getUpcomingMovies();
      responseSend(res, { movies }, "Upcoming movies fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching upcoming movies:", error.message);
      responseSend(res, null, error.message || "Error fetching upcoming movies", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async getMoviesByGenre(req: Request, res: Response): Promise<void> {
    try {
      const { genre } = req.params;
      const movies = await movieService.getMoviesByGenre(genre);
      responseSend(res, { movies }, `Movies by genre '${genre}' fetched successfully`, HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching movies by genre:", error.message);
      responseSend(res, null, error.message || "Error fetching movies by genre", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async searchMovies(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      const movies = await movieService.searchMovies(query as string);
      responseSend(res, { movies }, `Movies matching '${query}' fetched successfully`, HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error searching movies:", error.message);
      responseSend(res, null, error.message || "Error searching movies", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async createMovie(req: Request, res: Response): Promise<void> {
    try {
      const movieData = req.body;
  
      if (req.files && "poster" in req.files && req.files["poster"][0]) {
        const posterFile = req.files["poster"][0];
        const posterResult = await CloudinaryService.uploadFile(posterFile.path, 'movie-posters');
        movieData.posterUrl = posterResult.secure_url;
        movieData.posterPublicId = posterResult.public_id;
      }
      
      if (req.files && "trailer" in req.files && req.files["trailer"][0]) {
        const trailerFile = req.files["trailer"][0];
        const trailerResult = await CloudinaryService.uploadFile(trailerFile.path, 'movie-trailers');
        movieData.trailerUrl = trailerResult.secure_url;
        movieData.trailerPublicId = trailerResult.public_id;
      }
  
      const movie = await movieService.createMovie(movieData);
      responseSend(res, { movie }, "Movie created successfully", HTTP_STATUS_CODES.CREATED);
    } catch (error: any) {
      console.error("Error creating movie:", error.message);
      responseSend(res, null, error.message || "Error creating movie", HTTP_STATUS_CODES.BAD_REQUEST);
    }
  }

  static async updateMovie(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const movieData = req.body;
  
      const existingMovie = await movieService.getMovieById(id);
  
      if (req.files && "poster" in req.files && req.files["poster"][0]) {
        const posterFile = req.files["poster"][0];
        const posterResult = await CloudinaryService.uploadFile(posterFile.path, 'movie-posters');
        movieData.posterUrl = posterResult.secure_url;
        movieData.posterPublicId = posterResult.public_id;
        
        if (existingMovie && existingMovie.posterPublicId) {
          await CloudinaryService.deleteFile(existingMovie.posterPublicId);
        }
      }
      
      if (req.files && "trailer" in req.files && req.files["trailer"][0]) {
        const trailerFile = req.files["trailer"][0];
        const trailerResult = await CloudinaryService.uploadFile(trailerFile.path, 'movie-trailers');
        movieData.trailerUrl = trailerResult.secure_url;
        movieData.trailerPublicId = trailerResult.public_id;
        
        if (existingMovie && existingMovie.trailerPublicId) {
          await CloudinaryService.deleteFile(existingMovie.trailerPublicId);
        }
      }
  
      const movie = await movieService.updateMovie(id, movieData);
  
      if (!movie) {
        responseSend(res, null, "Movie not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }
  
      responseSend(res, { movie }, "Movie updated successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error updating movie:", error.message);
      responseSend(res, null, error.message || "Error updating movie", HTTP_STATUS_CODES.BAD_REQUEST);
    }
  }

  static async deleteMovie(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await movieService.deleteMovie(id);

      if (!result) {
        responseSend(res, null, "Movie not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }

      responseSend(res, null, "Movie deleted successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error deleting movie:", error.message);
      responseSend(res, null, error.message || "Error deleting movie", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  static async getMovieShowtimes(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      let date = undefined;

      if (req.query.date) {
        date = new Date(req.query.date as string);
      }

      const showtimes = await movieService.getMovieShowtimes(id, date);
      responseSend(res, { showtimes }, "Movie showtimes fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching movie showtimes:", error.message);
      responseSend(res, null, error.message || "Error fetching movie showtimes", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
}

export { uploadMovieFiles };