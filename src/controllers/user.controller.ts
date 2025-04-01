// File điều khiển xử lý các yêu cầu HTTP liên quan đến người dùng
import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../httpStatus/httpStatusCode";
import { isValidEmail, isValidPhoneNumber, isValidPassword, isValidDateOfBirth } from "../utils/validation";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { generateWebSocketToken } from "../middlewares/auth.middleware"; // Import hàm tạo token WebSocket
import { UserService } from "../services/user.service";
import { responseSend } from "../config/response";

const userService = new UserService();

export class UserController {
    // Phương thức đăng ký người dùng
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

            // Sửa thứ tự tham số: gender trước, username sau
            const user = await userService.register(email, password, phone, dateofbirth, gender, username, avatar);
            const userPayload = { id: user.id, username: user.username, email: user.email, role: user.role };
            const accessToken = generateAccessToken(userPayload);
            const refreshToken = generateRefreshToken(userPayload);
            
            // Tạo token cho WebSocket
            const wsToken = generateWebSocketToken(user.id, user.username, user.email, user.role);

            res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });
            responseSend(
                res, 
                { 
                    user, 
                    accessToken,
                    wsToken // Trả về token WebSocket cho client
                }, 
                "Đăng ký thành công", 
                HTTP_STATUS_CODES.CREATED
            );
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

    // Phương thức đăng nhập người dùng
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
            const userPayload = { id: user.id, username: user.username, email: user.email, role: user.role };
            const accessToken = generateAccessToken(userPayload);
            const refreshToken = generateRefreshToken(userPayload);
            
            // Tạo token cho WebSocket
            const wsToken = generateWebSocketToken(user.id, user.username, user.email, user.role);

            res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });
            responseSend(
                res, 
                { 
                    user, 
                    accessToken,
                    wsToken // Trả về token WebSocket cho client
                }, 
                "Đăng nhập thành công", 
                HTTP_STATUS_CODES.OK
            );
        } catch (error: any) {
            console.error("Error logging in:", error.message);
            responseSend(res, null, error.message || "Lỗi khi đăng nhập", HTTP_STATUS_CODES.UNAUTHORIZED);
        }
    }

    // Phương thức lấy tất cả người dùng
    static async getAllUsers(req: Request, res: Response) {
        try {
            const users = await userService.getAllUsers();
            responseSend(res, { users }, "Lấy danh sách người dùng thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi lấy danh sách người dùng", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }

    // Phương thức làm mới token
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
            
            // Tạo token WebSocket mới
            const wsToken = generateWebSocketToken(
                decoded.id,
                decoded.username,
                decoded.email,
                decoded.role
            );

            responseSend(
                res, 
                { 
                    accessToken: newAccessToken,
                    wsToken // Trả về token WebSocket mới
                }, 
                "Làm mới token thành công", 
                HTTP_STATUS_CODES.OK
            );
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi làm mới token", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }

    // Phương thức lấy token WebSocket (endpoint mới)
    static async getWebSocketToken(req: Request, res: Response) {
        try {
            // Lấy thông tin người dùng từ request (đã được xác thực qua middleware)
            const user = req.user;
            
            if (!user || !user.id) {
                return responseSend(res, null, "Không thể xác thực người dùng", HTTP_STATUS_CODES.UNAUTHORIZED);
            }
            
            // Tạo token WebSocket
            const wsToken = generateWebSocketToken(
                user.id,
                user.username,
                user.email,
                user.role
            );
            
            responseSend(
                res, 
                { wsToken },
                "Tạo token WebSocket thành công", 
                HTTP_STATUS_CODES.OK
            );
        } catch (error: any) {
            responseSend(
                res, 
                null, 
                error.message || "Lỗi khi tạo token WebSocket", 
                HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
    }

    // Phương thức xử lý yêu cầu quên mật khẩu
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

    // Lấy thông tin người dùng theo ID
    static async getUserById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(id);
            responseSend(res, { user }, "Lấy thông tin người dùng thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi lấy thông tin người dùng", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }

    // Cập nhật thông tin người dùng
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

    // Xóa người dùng
    static async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await userService.deleteUser(id);
            responseSend(res, result, "Xóa người dùng thành công", HTTP_STATUS_CODES.OK);
        } catch (error: any) {
            responseSend(res, null, error.message || "Lỗi khi xóa người dùng", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    }
}