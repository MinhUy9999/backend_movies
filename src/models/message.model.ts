import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  userId: mongoose.Types.ObjectId;  
  adminId: mongoose.Types.ObjectId; 
  sender: "user" | "admin";       
  content: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sender: { type: String, enum: ["user", "admin"], required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);