import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;     // Người dùng thông thường
  adminId: mongoose.Types.ObjectId;    // Admin
  lastMessage: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

ConversationSchema.index({ userId: 1, adminId: 1 }, { unique: true });

ConversationSchema.pre('save', async function(next) {
  const User = mongoose.model('User');
  
  const user = await User.findById(this.userId);
  const admin = await User.findById(this.adminId);
  
  if (!user || user.role !== 'user') {
    return next(new Error('First participant must have user role'));
  }
  
  if (!admin || admin.role !== 'admin') {
    return next(new Error('Second participant must have admin role'));
  }
  
  next();
});

export const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema);