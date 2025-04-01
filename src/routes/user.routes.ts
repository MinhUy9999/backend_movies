// File định tuyến các endpoint liên quan đến người dùng
import express, { Request, Response } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";

const userRoutes = express.Router();

const router = express.Router();

userRoutes.post("/register", async (req: Request, res: Response) => {
    await UserController.register(req, res);
});

userRoutes.post("/login", (req: Request, res: Response) => {
    UserController.login(req, res);
});

userRoutes.post("/refresh-token", (req: Request, res: Response) => {
    UserController.refreshToken(req, res);
});

userRoutes.post("/logout", (req: Request, res: Response) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
    res.json({ message: "Logout successful" });
});
// Endpoint gửi email quên mật khẩu
userRoutes.post("/forgot-password", (req: Request, res: Response) => {
    UserController.forgotPassword(req, res);
});

// Endpoint đặt lại mật khẩu
userRoutes.post("/reset-password", (req: Request, res: Response) => {
    UserController.resetPassword(req, res);
});
userRoutes.get("/:id", UserController.getUserById);  // Lấy thông tin user theo ID
userRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), UserController.updateUser);  // Cập nhật user
userRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), UserController.deleteUser);  // Xóa user
userRoutes.get("/users", authenticateToken, authorizeRoles("admin"), UserController.getAllUsers);
export default userRoutes;
