import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { TheaterService } from "../services/Theater.service";
import { responseSend } from "../config/response";

const theaterService = new TheaterService();

export class TheaterController {
  static async getAllTheaters(req: Request, res: Response): Promise<void> {
    try {
      const theaters = await theaterService.getAllTheaters();
      responseSend(res, { theaters }, "Theaters fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching theaters:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching theaters",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getTheaterById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const theater = await theaterService.getTheaterById(id);
      if (!theater) {
        responseSend(res, null, "Theater not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }
      responseSend(res, { theater }, "Theater fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching theater:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching theater",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async createTheater(req: Request, res: Response): Promise<void> {
    try {
      const theaterData = req.body;
      const theater = await theaterService.createTheater(theaterData);
      responseSend(
        res,
        { theater },
        "Theater created successfully",
        HTTP_STATUS_CODES.CREATED
      );
    } catch (error: any) {
      console.error("Error creating theater:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error creating theater",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async updateTheater(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const theaterData = req.body;
      const theater = await theaterService.updateTheater(id, theaterData);
      if (!theater) {
        responseSend(res, null, "Theater not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }
      responseSend(
        res,
        { theater },
        "Theater updated successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error updating theater:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error updating theater",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async deleteTheater(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await theaterService.deleteTheater(id);
      responseSend(res, null, "Theater deleted successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error deleting theater:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error deleting theater",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getTheaterScreens(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const screens = await theaterService.getTheaterScreens(id);
      responseSend(res, { screens }, "Theater screens fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching theater screens:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching theater screens",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
}