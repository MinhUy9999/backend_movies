import { Request, Response } from "express";
import { SeatService } from "../services/seat.service";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { responseSend } from "../config/response";


export class SeatController {
    static async getAllSeats(req: Request, res: Response) {
        try {
            const seats = await SeatService.getAllSeats();
            responseSend(res, seats, "Lấy danh sách ghế thành công", HTTP_STATUS_CODES.OK);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi lấy danh sách ghế",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async getSeatById(req: Request, res: Response) {
        try {
            const seat = await SeatService.getSeatById(req.params.id);
            if (!seat) {
                return responseSend(
                    res,
                    null,
                    "Không tìm thấy ghế",
                    HTTP_STATUS_CODES.NOT_FOUND
                );
            }
            responseSend(res, seat, "Lấy thông tin ghế thành công", HTTP_STATUS_CODES.OK);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi lấy thông tin ghế",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async createSeat(req: Request, res: Response) {
        try {
            const newSeat = await SeatService.createSeat(req.body);
            responseSend(res, newSeat, "Tạo ghế thành công", HTTP_STATUS_CODES.CREATED);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi tạo ghế",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async updateSeat(req: Request, res: Response) {
        try {
            const updatedSeat = await SeatService.updateSeat(req.params.id, req.body);
            if (!updatedSeat) {
                return responseSend(
                    res,
                    null,
                    "Ghế không tồn tại",
                    HTTP_STATUS_CODES.NOT_FOUND
                );
            }
            responseSend(res, updatedSeat, "Cập nhật ghế thành công", HTTP_STATUS_CODES.OK);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi cập nhật ghế",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async deleteSeat(req: Request, res: Response) {
        try {
            const deletedSeat = await SeatService.deleteSeat(req.params.id);
            if (!deletedSeat) {
                return responseSend(
                    res,
                    null,
                    "Ghế không tồn tại",
                    HTTP_STATUS_CODES.NOT_FOUND
                );
            }
            responseSend(res, null, "Đã xóa ghế thành công", HTTP_STATUS_CODES.OK);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi xóa ghế",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async reserveSeat(req: Request, res: Response) {
        try {
            const { seatId } = req.body;
            const seat = await SeatService.updateSeat(seatId, {
                status: "reserved",
                expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15-minute reservation
            });
            if (!seat) {
                return responseSend(
                    res,
                    null,
                    "Ghế không tồn tại",
                    HTTP_STATUS_CODES.NOT_FOUND
                );
            }
            responseSend(res, seat, "Đã đặt ghế tạm thời", HTTP_STATUS_CODES.OK);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi đặt ghế tạm thời",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async bookSeat(req: Request, res: Response) {
        try {
            const { seatId, bookingId } = req.body;
            const seat = await SeatService.updateSeat(seatId, {
                status: "booked",
                bookingId,
                expiresAt: undefined, // Clear expiration
            });
            if (!seat) {
                return responseSend(
                    res,
                    null,
                    "Ghế không tồn tại",
                    HTTP_STATUS_CODES.NOT_FOUND
                );
            }
            responseSend(res, seat, "Đã xác nhận đặt ghế", HTTP_STATUS_CODES.OK);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi xác nhận đặt ghế",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async releaseSeat(req: Request, res: Response) {
        try {
            const { seatId } = req.body;
            const seat = await SeatService.updateSeat(seatId, {
                status: "available",
                bookingId: undefined,
                expiresAt: undefined,
            });
            if (!seat) {
                return responseSend(
                    res,
                    null,
                    "Ghế không tồn tại",
                    HTTP_STATUS_CODES.NOT_FOUND
                );
            }
            responseSend(res, seat, "Đã hủy đặt ghế", HTTP_STATUS_CODES.OK);
        } catch (error) {
            responseSend(
                res,
                null,
                "Lỗi khi hủy đặt ghế",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }
    // Thêm phương thức này vào SeatController
    static async getSeatsByShowtime(req: Request, res: Response) {
        try {
            const { showtimeId } = req.params;

            if (!showtimeId) {
                return responseSend(
                    res,
                    null,
                    "ID suất chiếu không hợp lệ",
                    HTTP_STATUS_CODES.BAD_REQUEST
                );
            }

            const seats = await SeatService.getSeatsByShowtime(showtimeId);
            responseSend(res, seats, "Lấy danh sách ghế theo suất chiếu thành công", HTTP_STATUS_CODES.OK);
        } catch (error) {
            console.error("Error in getSeatsByShowtime:", error);
            responseSend(
                res,
                null,
                "Lỗi khi lấy danh sách ghế theo suất chiếu",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }
}