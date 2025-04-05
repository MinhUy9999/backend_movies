import { Socket } from 'socket.io';
import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { isValidEmail, isValidPhoneNumber, isValidPassword, isValidDateOfBirth } from "../utils/validation";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { UserService } from "../services/user.service";
import { responseSend } from "../config/response";

import { User } from "../models/user.model";

const userService = new UserService();

interface AuthRequest extends Request {
    user?: any;
}

export class UserController {
    static async register(req: Request, res: Response) {
        try {
            const { email, password, phone, dateofbirth, gender, username, avatar } = req.body;

            if (!username) {
                return responseSend(res, null, "Username là bắt buộc", HTTP_STATUS_CODES.BAD_REQUEST);
            }
            if (!isValidEmail(email)) {
                return responseSend(res, null, "Định dạng email không hợp lệ", HTTP_STATUS_CODES.BAD_REQUEST);
            }
            if (!isValidPhoneNumber(phone)) {
                return responseSend(
                    res,
                    null,
                    "Định dạng số điện thoại không hợp lệ (ít nhất 10 số)",
                    HTTP_STATUS_CODES.BAD_REQUEST
                );
            }
            if (!isValidPassword(password)) {
                return responseSend(
                    res,
                    null,
                    "Mật khẩu phải dài ít nhất 8 ký tự và chứa ít nhất 1 chữ cái và 1 số",
                    HTTP_STATUS_CODES.BAD_REQUEST
                );
            }
            if (!isValidDateOfBirth(dateofbirth)) {
                return responseSend(
                    res,
                    null,
                    "Định dạng ngày không hợp lệ (phải là dd/mm/yyyy)",
                    HTTP_STATUS_CODES.BAD_REQUEST
                );
            }

            const user = await userService.register(email, password, phone, dateofbirth, gender, username, avatar);
            const userId = user._id ? user._id.toString() : '';
            const userPayload = { id: userId, username: user.username, email: user.email, role: user.role };
            const accessToken = generateAccessToken(userPayload);
            const refreshToken = generateRefreshToken(userPayload);

            res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });
            responseSend(res, { user, accessToken }, "Đăng ký thành công", HTTP_STATUS_CODES.CREATED);
        } catch (error: any) {
            console.error("Error registering user:", error.message);
            responseSend(
                res,
                null,
                error.message || "Lỗi khi đăng ký người dùng",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!isValidEmail(email)) {
                return responseSend(res, null, "Định dạng email không hợp lệ", HTTP_STATUS_CODES.BAD_REQUEST);
            }
            if (!isValidPassword(password)) {
                return responseSend(res, null, "Định dạng mật khẩu không hợp lệ", HTTP_STATUS_CODES.BAD_REQUEST);
            }

            const user = await userService.login(email, password);
            const userId = user._id ? user._id.toString() : '';
            const userPayload = { id: userId, username: user.username, email: user.email, role: user.role };
            const accessToken = generateAccessToken(userPayload);
            const refreshToken = generateRefreshToken(userPayload);

            res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });
            responseSend(res, { user, accessToken }, "Đăng nhập thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            console.error("Error logging in:", error.message);
            responseSend(res, null, error.message || "Lỗi khi đăng nhập", HTTP_STATUS_CODES.UNAUTHORIZED);
        }
    }
    static async getAllUsers(req: Request, res: Response) {
        try {
            const users = await userService.getAllUsers();
            responseSend(res, { users }, "Lấy danh sách người dùng thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi lấy danh sách người dùng", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }
    static async refreshToken(req: Request, res: Response) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                return responseSend(res, null, "Không có refresh token", HTTP_STATUS_CODES.UNAUTHORIZED);
            }

            const decoded: any = verifyRefreshToken(refreshToken);
            if (!decoded) {
                return responseSend(res, null, "Refresh token không hợp lệ", HTTP_STATUS_CODES.FORBIDDEN);
            }

            const userPayload = {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                role: decoded.role,
            };
            const newAccessToken = generateAccessToken(userPayload);

            responseSend(res, { accessToken: newAccessToken }, "Làm mới token thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi làm mới token", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }
    static async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!isValidEmail(email)) {
                return responseSend(res, null, "Định dạng email không hợp lệ", HTTP_STATUS_CODES.BAD_REQUEST);
            }

            const result = await userService.forgotPassword(email);
            responseSend(res, result, "Gửi email đặt lại mật khẩu thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            console.error("Lỗi khi xử lý quên mật khẩu:", error.message);
            responseSend(res, null, error.message || "Lỗi khi gửi email đặt lại mật khẩu", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }

    static async resetPassword(req: Request, res: Response) {
        try {
            const { token, newPassword } = req.body;

            if (!token) {
                return responseSend(res, null, "Token không được cung cấp", HTTP_STATUS_CODES.BAD_REQUEST);
            }
            if (!isValidPassword(newPassword)) {
                return responseSend(res, null, "Mật khẩu mới phải dài ít nhất 8 ký tự và chứa ít nhất 1 chữ cái và 1 số", HTTP_STATUS_CODES.BAD_REQUEST);
            }

            const result = await userService.resetPassword(token, newPassword);
            responseSend(res, result, "Đặt lại mật khẩu thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            console.error("Lỗi khi đặt lại mật khẩu:", error.message);
            responseSend(res, null, error.message || "Lỗi khi đặt lại mật khẩu", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }
    static async getUserById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(id);
            responseSend(res, { user }, "Lấy thông tin người dùng thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi lấy thông tin người dùng", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }

    static async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const user = await userService.updateUser(id, updateData);
            responseSend(res, { user }, "Cập nhật thông tin người dùng thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi cập nhật thông tin người dùng", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }

    static async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await userService.deleteUser(id);
            responseSend(res, result, "Xóa người dùng thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi xóa người dùng", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }

    static async getOnlineUsers(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                responseSend(res, null, "Authentication required", HTTP_STATUS_CODES.UNAUTHORIZED);
                return;
            }
            
            const socketService = require('../socket/socket.service').default;
            const onlineUserIds = socketService.getOnlineUserIds();
            
            const onlineUsers = await User.find(
                { _id: { $in: onlineUserIds } },
                'username email avatar'
            );
            
            responseSend(
                res,
                { onlineUsers },
                "Online users fetched successfully",
                HTTP_STATUS_CODES.OK
            );
        } catch (error: any) {
            console.error("Error fetching online users:", error.message);
            responseSend(
                res,
                null,
                error.message || "Error fetching online users",
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }
}