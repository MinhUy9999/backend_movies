import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  showtimeId: mongoose.Types.ObjectId;
  seats: mongoose.Types.ObjectId[];
  totalAmount: number;
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  bookingStatus: "reserved" | "confirmed" | "cancelled";
  paymentMethod: string;
  transactionId?: string;
  bookedAt: Date;
}

const BookingSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  showtimeId: { type: Schema.Types.ObjectId, ref: "Showtime", required: true },
  seats: [{ type: Schema.Types.ObjectId, ref: "Seat", required: true }],
  totalAmount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  bookingStatus: {
    type: String,
    enum: ["reserved", "confirmed", "cancelled"],
    default: "reserved",
  },
  paymentMethod: { type: String },
  transactionId: { type: String },
  bookedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Validation: Đảm bảo tất cả ghế thuộc cùng Showtime
BookingSchema.pre<IBooking>("save", async function (next) {
  const SeatReservation = mongoose.model("SeatReservation");
  const showtimeId = this.showtimeId;

  // Kiểm tra từng seat trong mảng seats
  const reservations = await SeatReservation.find({
    seatId: { $in: this.seats },
    showtimeId: showtimeId,
  });

  if (reservations.length !== this.seats.length) {
    next(new Error("All seats must belong to the same showtime"));
  } else {
    next();
  }
});

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);