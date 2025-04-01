import mongoose, { Schema, Document } from "mongoose";

export interface ISeat extends Document {
  screenId: mongoose.Types.ObjectId;
  row: string;
  seatNumber: number;
  seatType: "standard" | "premium" | "vip";
  isActive: boolean;
  showtimeId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  status: "reserved" | "booked" | "available";
  expiresAt?: Date;
}

const SeatSchema: Schema = new Schema(
  {
    screenId: { type: Schema.Types.ObjectId, ref: "Screen", required: true },
    row: { type: String, required: true },
    seatNumber: { type: Number, required: true },
    seatType: { type: String, enum: ["standard", "premium", "vip"], default: "standard" },
    isActive: { type: Boolean, default: true },

    // Thông tin đặt ghế
    showtimeId: { type: Schema.Types.ObjectId, ref: "Showtime", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    status: { type: String, enum: ["reserved", "booked", "available"], default: "available" },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Đảm bảo mỗi ghế trong một suất chiếu là duy nhất
SeatSchema.index({ showtimeId: 1, row: 1, seatNumber: 1 }, { unique: true });

export const Seat = mongoose.model<ISeat>("Seat", SeatSchema);
