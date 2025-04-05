import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  createdAt: Date;
  sender: "user" | "admin";  
}

const MessageSchema: Schema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sender: { type: String, enum: ["user", "admin"], required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

MessageSchema.pre('save', async function(next) {
  const User = mongoose.model('User');
  const sender = await User.findById(this.senderId);
  
  if (!sender) {
    return next(new Error('Sender not found'));
  }
  
  this.sender = sender.role;
  next();
});

export const Message = mongoose.model<IMessage>("Message", MessageSchema);