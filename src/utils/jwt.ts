import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error("Missing JWT secrets in .env file");
}

/**
 * Tạo access token JWT
 * @param user Thông tin người dùng
 * @returns Access token
 */
export const generateAccessToken = (user: { id: string; username: string; email: string; role: string }) => {
    return jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
};

/**
 * Tạo refresh token JWT
 * @param user Thông tin người dùng
 * @returns Refresh token
 */
export const generateRefreshToken = (user: { id: string; username: string; email: string; role: string }) => {
    return jwt.sign(user, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

/**
 * Xác thực access token
 * @param token Access token cần xác thực
 * @returns Dữ liệu đã giải mã hoặc null nếu không hợp lệ
 */
export const verifyAccessToken = (token: string) => {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Xác thực refresh token
 * @param token Refresh token cần xác thực
 * @returns Dữ liệu đã giải mã hoặc null nếu không hợp lệ
 */
export const verifyRefreshToken = (token: string) => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Lấy thông tin người dùng từ token JWT
 * @param token JWT token
 * @returns Thông tin người dùng hoặc null nếu không hợp lệ
 */
export const getUserFromToken = (token: string) => {
    try {
        const decoded: any = jwt.decode(token);
        if (!decoded) return null;
        
        return {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
        };
    } catch (error) {
        return null;
    }
};