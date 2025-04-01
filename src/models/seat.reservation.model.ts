import mongoose, { Schema, Document } from "mongoose";

export interface ISeatReservation extends Document {
  showtimeId: mongoose.Types.ObjectId;
  seatId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  status: "reserved" | "booked" | "available";
  expiresAt?: Date;
}

const SeatReservationSchema: Schema = new Schema({
  showtimeId: { type: Schema.Types.ObjectId, ref: "Showtime", required: true },
  seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
  status: {
    type: String,
    enum: ["reserved", "booked", "available"],
    default: "available",
  },
  expiresAt: { type: Date },
}, { timestamps: true });

SeatReservationSchema.index({ showtimeId: 1, seatId: 1 }, { unique: true });

export const SeatReservation = mongoose.model<ISeatReservation>("SeatReservation", SeatReservationSchema);