// File định tuyến các endpoint liên quan đến người dùng
import express, { Request, Response } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";

const userRoutes = express.Router();

// Đăng ký người dùng mới
userRoutes.post("/register", async (req: Request, res: Response) => {
    await UserController.register(req, res);
});

// Đăng nhập người dùng
userRoutes.post("/login", (req: Request, res: Response) => {
    UserController.login(req, res);
});

// Làm mới access token bằng refresh token
userRoutes.post("/refresh-token", (req: Request, res: Response) => {
    UserController.refreshToken(req, res);
});

// Lấy token WebSocket (yêu cầu đã xác thực)
userRoutes.get("/ws-token", authenticateToken, (req: Request, res: Response) => {
    UserController.getWebSocketToken(req, res);
});

// Đăng xuất (xóa refresh token)
userRoutes.post("/logout", (req: Request, res: Response) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
    res.json({ message: "Logout successful" });
});

// Gửi email quên mật khẩu
userRoutes.post("/forgot-password", (req: Request, res: Response) => {
    UserController.forgotPassword(req, res);
});

// Đặt lại mật khẩu
userRoutes.post("/reset-password", (req: Request, res: Response) => {
    UserController.resetPassword(req, res);
});

// Lấy thông tin user theo ID
userRoutes.get("/:id", UserController.getUserById);

// Cập nhật thông tin user (yêu cầu xác thực và quyền admin)
userRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), UserController.updateUser);

// Xóa user (yêu cầu xác thực và quyền admin)
userRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), UserController.deleteUser);

// Lấy danh sách tất cả user (yêu cầu xác thực và quyền admin)
userRoutes.get("/", authenticateToken, authorizeRoles("admin"), UserController.getAllUsers);

export default userRoutes;