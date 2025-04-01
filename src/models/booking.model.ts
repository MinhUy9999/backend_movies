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

// Validation: Ensure all seats belong to the same Showtime
BookingSchema.pre<IBooking>("save", async function (next) {
  const Seat = mongoose.model("Seat");
  const showtimeId = this.showtimeId;

  // Check each seat in the seats array
  const seats = await Seat.find({
    _id: { $in: this.seats },
    showtimeId: showtimeId,
  });

  if (seats.length !== this.seats.length) {
    next(new Error("All seats must belong to the same showtime"));
  } else {
    next();
  }
});

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);