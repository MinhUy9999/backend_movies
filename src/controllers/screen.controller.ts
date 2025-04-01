import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { ScreenService } from "../services/screen.service";
import { responseSend } from "../config/response"; // Import hàm responseSend

const screenService = new ScreenService();

export class ScreenController {
  static async getAllScreens(req: Request, res: Response): Promise<void> {
    try {
      const screens = await screenService.getAllScreens();
      responseSend(res, { screens }, "Screens fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching screens:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching screens",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getScreenById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const screen = await screenService.getScreenById(id);

      if (!screen) {
        responseSend(res, null, "Screen not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }

      responseSend(res, { screen }, "Screen fetched successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error fetching screen:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching screen",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async createScreen(req: Request, res: Response): Promise<void> {
    try {
      const screenData = req.body;
      const screen = await screenService.createScreen(screenData);

      responseSend(res, { screen }, "Screen created successfully", HTTP_STATUS_CODES.CREATED);
    } catch (error: any) {
      console.error("Error creating screen:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error creating screen",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async updateScreen(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const screenData = req.body;
      const screen = await screenService.updateScreen(id, screenData);

      if (!screen) {
        responseSend(res, null, "Screen not found", HTTP_STATUS_CODES.NOT_FOUND);
        return;
      }

      responseSend(res, { screen }, "Screen updated successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error updating screen:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error updating screen",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }

  static async deleteScreen(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await screenService.deleteScreen(id);

      responseSend(res, null, "Screen deleted successfully", HTTP_STATUS_CODES.OK);
    } catch (error: any) {
      console.error("Error deleting screen:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error deleting screen",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getScreenSeats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const seatingLayout = await screenService.getScreenSeats(id);

      responseSend(
        res,
        { seatingLayout },
        "Screen seats fetched successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error fetching screen seats:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error fetching screen seats",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async updateScreenSeats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { seats } = req.body;

      const count = await screenService.updateScreenSeats(id, seats);

      responseSend(
        res,
        { count },
        "Screen seats updated successfully",
        HTTP_STATUS_CODES.OK
      );
    } catch (error: any) {
      console.error("Error updating screen seats:", error.message);
      responseSend(
        res,
        null,
        error.message || "Error updating screen seats",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  }
}