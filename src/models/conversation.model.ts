import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  type: "user-admin" | "admin-admin";
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadUser: number;
  unreadAdmin: number;
  unreadInitiator?: number;
  unreadReceiver?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
  type: { 
    type: String, 
    enum: ["user-admin", "admin-admin"], 
    default: "user-admin" 
  },
  unreadInitiator: { type: Number, default: 0 },
  unreadReceiver: { type: Number, default: 0 },
  unreadUser: { type: Number, default: 0 },
  unreadAdmin: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ConversationSchema.index({ userId: 1, adminId: 1, type: 1 }, { unique: true });

export const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema);