import express, { Request, Response } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware";

const userRoutes = express.Router();

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

userRoutes.post("/forgot-password", (req: Request, res: Response) => {
    UserController.forgotPassword(req, res);
});

userRoutes.post("/reset-password", (req: Request, res: Response) => {
    UserController.resetPassword(req, res);
});

userRoutes.get("/:id", UserController.getUserById);  
userRoutes.put("/:id", authenticateToken, authorizeRoles("admin"), UserController.updateUser);  
userRoutes.delete("/:id", authenticateToken, authorizeRoles("admin"), UserController.deleteUser);  
userRoutes.get("/users", authenticateToken, authorizeRoles("admin"), UserController.getAllUsers);

userRoutes.get("/online", authenticateToken, (req: Request, res: Response) => {
    UserController.getOnlineUsers(req, res);
});

export default userRoutes;