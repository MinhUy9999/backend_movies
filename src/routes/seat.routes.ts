import express, { Request, Response } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";
import { SeatController } from "../controllers/seat.controller";

const seatRoutes = express.Router();

// Lấy danh sách tất cả ghế - cho phép public access
seatRoutes.get("/", SeatController.getAllSeats);

// Lấy ghế theo showtime - cho phép public access
seatRoutes.get("/showtime/:showtimeId", SeatController.getSeatsByShowtime);

// Lấy thông tin một ghế theo ID - public access
seatRoutes.get("/:id", SeatController.getSeatById);

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

// Đặt ghế tạm thời (reserved) - yêu cầu đăng nhập
seatRoutes.post("/reserve", authenticateToken, async (req: Request, res: Response) => {
    await SeatController.reserveSeat(req, res);
});

// Xác nhận đặt ghế (booked) - yêu cầu đăng nhập
seatRoutes.post("/book", authenticateToken, async (req: Request, res: Response) => {
    await SeatController.bookSeat(req, res);
});

// Hủy đặt ghế - yêu cầu đăng nhập
seatRoutes.post("/release", authenticateToken, async (req: Request, res: Response) => {
    await SeatController.releaseSeat(req, res);
});

export default seatRoutes;