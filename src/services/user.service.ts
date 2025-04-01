// File dịch vụ xử lý logic nghiệp vụ cho user
// File này sẽ chứa các phương thức xử lý logic nghiệp vụ liên quan đến user như đăng ký, đăng nhập, lấy thông tin user, v.v.
import { IUser, User } from "../models/user.model";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
// Cấu hình transporter cho nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
export class UserService {
    // Phương thức xử lý đăng ký người dùng mới 
    async register(
        email: string,
        password: string,
        phone: string,
        dateofbirth: string,
        gender: string,
        username: string, // Thêm username vào tham số
        avatar?: string
    ) {
        try {
            // Kiểm tra email hoặc username đã tồn tại
            const existingUser = await User.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                if (existingUser.email === email) {
                    throw new Error("Email already exists");
                }
                if (existingUser.username === username) {
                    throw new Error("Username already exists");
                }
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const defaultAvatar =
                gender === "male"
                    ? `https://avatar.iran.liara.run/public/boy?email=${email}`
                    : `https://avatar.iran.liara.run/public/girl?email=${email}`;
            const finalAvatar = avatar || defaultAvatar;

            const [day, month, year] = dateofbirth.split("/");
            const dobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            const newUser = new User({
                email,
                password: hashedPassword,
                phone,
                dateofbirth: dobDate,
                gender,
                username, // Sử dụng username từ tham số
                avatar: finalAvatar,
                role: "user",
            });

            await newUser.save();

            return newUser;
        } catch (error: unknown) {
            const err = error as Error;
            throw new Error(err.message || "Error registering user");
        }
    }
    // Phương thức xử lý đăng nhập người dùng
    async login(email: string, password: string) {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                throw new Error("User not found");
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error("Invalid password");
            }
            return user;
        } catch (error: any) {
            throw new Error(error.message || "Error logging in");
        }
    }
    // Phương thức lấy danh sách người dùng tất cả
    async getAllUsers() {
        return await User.find().select("-password");
    }

    // Thêm phương thức lấy thông tin người dùng theo id
    async getUserById(userId: string) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error("User not found");
            }
            return user;
        } catch (error: any) {
            throw new Error(error.message || "Error finding user");
        }
    }
    // Phương thức gửi email quên mật khẩu
    async forgotPassword(email: string) {
        try {
            const user = await User.findOne({ email }); // Tìm người dùng theo email
            if (!user) {
                throw new Error("Không tìm thấy người dùng với email này");
            }

            // Tạo token đặt lại mật khẩu (có thể dùng JWT hoặc chuỗi ngẫu nhiên)
            const resetToken = Math.random().toString(36).slice(2); // Chuỗi ngẫu nhiên đơn giản
            const resetTokenExpiry = Date.now() + 3600000; // Hết hạn sau 1 giờ

            // Lưu token và thời gian hết hạn vào DB
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = new Date(resetTokenExpiry);
            await user.save();

            // Tạo liên kết đặt lại mật khẩu
            const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

            // Cấu hình email
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Đặt lại mật khẩu",
                html: `
                    <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
                    <p>Vui lòng click vào <a href="${resetLink}">đây</a> để đặt lại mật khẩu.</p>
                    <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
                `,
            };

            // Gửi email
            await transporter.sendMail(mailOptions);
            return { message: "Email đặt lại mật khẩu đã được gửi" };
        } catch (error: any) {
            throw new Error(error.message || "Lỗi khi gửi email đặt lại mật khẩu");
        }
    }
    // Phương thức đặt lại mật khẩu
    async resetPassword(token: string, newPassword: string) {
        try {
            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }, // Kiểm tra token còn hạn
            });

            if (!user) {
                throw new Error("Token không hợp lệ hoặc đã hết hạn");
            }

            // Mã hóa mật khẩu mới
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined; // Xóa token
            user.resetPasswordExpires = undefined; // Xóa thời gian hết hạn
            await user.save();

            return { message: "Đặt lại mật khẩu thành công" };
        } catch (error: any) {
            throw new Error(error.message || "Lỗi khi đặt lại mật khẩu");
        }
    }
    // Cập nhật thông tin người dùng
    async updateUser(userId: string, updateData: Partial<IUser>) {
        try {
            const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
            if (!user) {
                throw new Error("User not found");
            }
            return user;
        } catch (error: any) {
            throw new Error(error.message || "Error updating user");
        }
    }

    // Xóa người dùng
    async deleteUser(userId: string) {
        try {
            const user = await User.findByIdAndDelete(userId);
            if (!user) {
                throw new Error("User not found");
            }
            return { message: "User deleted successfully" };
        } catch (error: any) {
            throw new Error(error.message || "Error deleting user");
        }
    }
}