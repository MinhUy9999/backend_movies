import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;  
  adminId: mongoose.Types.ObjectId; 
  senderId?: mongoose.Types.ObjectId;
  sender: "user" | "admin";       
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const MessageSchema: Schema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User" },
  sender: { type: String, enum: ["user", "admin"], required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);