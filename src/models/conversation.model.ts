import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadUser: number;
  unreadAdmin: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
  unreadUser: { type: Number, default: 0 },
  unreadAdmin: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ConversationSchema.index({ userId: 1, adminId: 1 }, { unique: true });

export const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema);