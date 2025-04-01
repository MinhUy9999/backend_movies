import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { ShowtimeService } from "../services/showtime.service";
import { responseSend } from "../config/response"; // Import hàm responseSend

const showtimeService = new ShowtimeService();

export class ShowtimeController {
  static async getAllShowtimes(req: Request, res: Response): Promise<void> {
    try {
      let date = undefined;

      // Check if date query parameter is provided
      if (req.query.date) {
        date = new Date(req.query.date as string);
      }

      const showtimes = await showtimeService.getAllShowtimes(date);
      responseSend(res, { showtimes }, "Showtimes fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching showtimes:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching showtimes",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getShowtimeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const showtime = await showtimeService.getShowtimeById(id);

      if (!showtime) {
        responseSend(res, null, "Showtime not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }

      responseSend(res, { showtime }, "Showtime fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching showtime:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching showtime",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getShowtimesByMovie(req: Request, res: Response): Promise<void> {
    try {
      const { movieId } = req.params;
      const showtimes = await showtimeService.getShowtimesByMovie(movieId);
      responseSend(
        res,
        { showtimes },
        "Showtimes by movie fetched successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error fetching showtimes by movie:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching showtimes by movie",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getShowtimesByTheater(req: Request, res: Response): Promise<void> {
    try {
      const { theaterId } = req.params;
      const showtimes = await showtimeService.getShowtimesByTheater(theaterId);
      responseSend(
        res,
        { showtimes },
        "Showtimes by theater fetched successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error fetching showtimes by theater:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching showtimes by theater",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async createShowtime(req: Request, res: Response): Promise<void> {
    try {
      const showtimeData = req.body;
      const showtime = await showtimeService.createShowtime(showtimeData);
      responseSend(
        res,
        { showtime },
        "Showtime created successfully",
        HTTP_STATUS_CODES.CREATED
      );
    } catch (error: any) {
      console.error("Error creating showtime:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error creating showtime",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async updateShowtime(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const showtimeData = req.body;

      const showtime = await showtimeService.updateShowtime(id, showtimeData);

      if (!showtime) {
        responseSend(res, null, "Showtime not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }

      responseSend(
        res,
        { showtime },
        "Showtime updated successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error updating showtime:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error updating showtime",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async deleteShowtime(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await showtimeService.deleteShowtime(id);

      if (!result) {
        responseSend(res, null, "Showtime not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }

      responseSend(res, null, "Showtime deleted successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error deleting showtime:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error deleting showtime",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getShowtimeSeats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const seats = await showtimeService.getShowtimeSeats(id);
      responseSend(
        res,
        { seats },
        "Showtime seats fetched successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error fetching showtime seats:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching showtime seats",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
}