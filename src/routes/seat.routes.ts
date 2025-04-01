import express, { Request, Response } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";
import { SeatController } from "../controllers/seat.controller";

const seatRoutes = express.Router();

// Lấy danh sách tất cả ghế
seatRoutes.get("/", authenticateToken, authorizeRoles("admin"), SeatController.getAllSeats);

// Lấy thông tin một ghế theo ID
seatRoutes.get("/:id", authenticateToken, authorizeRoles("admin"), SeatController.getSeatById);

// Tạo ghế mới (Chỉ admin có quyền)
seatRoutes.post("/", authenticateToken, authorizeRoles("admin"), async (req: Request, res: Response) => {
    await SeatController.createSeat(req, res);
});

// Cập nhật thông tin ghế (Chỉ admin có quyền)
seatRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), async (req: Request, res: Response) => {
    await SeatController.updateSeat(req, res);
});

// Xóa ghế (Chỉ admin có quyền)
seatRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), async (req: Request, res: Response) => {
    await SeatController.deleteSeat(req, res);
});

// Đặt ghế tạm thời (reserved)
seatRoutes.post("/reserve", authenticateToken, async (req: Request, res: Response) => {
    await SeatController.reserveSeat(req, res);
});

// Xác nhận đặt ghế (booked)
seatRoutes.post("/book", authenticateToken, async (req: Request, res: Response) => {
    await SeatController.bookSeat(req, res);
});

// Hủy đặt ghế
seatRoutes.post("/release", authenticateToken, async (req: Request, res: Response) => {
    await SeatController.releaseSeat(req, res);
});

export default seatRoutes;
