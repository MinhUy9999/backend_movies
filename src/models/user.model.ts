// File định nghĩa schema, và model cho collection cho user trong mongoose 
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    gender: string;
    phone: string;
    dateofbirth: Date;
    avatar: string;
    role: "user" | "admin";
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    createdAt: Date;
    updatedAt: Date;
}
const UserSchema: Schema = new Schema({
    username: { type: String, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, match: [/^\S+@\S+\.\S+$/, "Invalid email format"] },
    gender: { type: String, required: true },
    phone: { type: String, required: true },
    dateofbirth: { type: Date, required: true },
    avatar: {
        type: String,
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    resetPasswordToken: { type: String, required: false },
    resetPasswordExpires: { type: Date, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const User = mongoose.model<IUser>("User", UserSchema);