import mongoose, { Schema, Document } from "mongoose";

export interface IShowtime extends Document {
  movieId: mongoose.Types.ObjectId;
  screenId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  price: {
    standard: number;
    premium: number;
    vip: number;
  };
  isActive: boolean;
}

const ShowtimeSchema: Schema = new Schema({
  movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
  screenId: { type: Schema.Types.ObjectId, ref: "Screen", required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  price: {
    standard: { type: Number, required: true, min: 0 },
    premium: { type: Number, required: true, min: 0 },
    vip: { type: Number, required: true, min: 0 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Ngăn chồng lấn thời gian trong cùng một phòng chiếu
ShowtimeSchema.index(
  { screenId: 1, startTime: 1, endTime: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Validation: endTime phải lớn hơn startTime
ShowtimeSchema.pre<IShowtime>("validate", function (next) {
  if (this.endTime <= this.startTime) {
    next(new Error("endTime must be greater than startTime"));
  } else {
    next();
  }
});

export const Showtime = mongoose.model<IShowtime>("Showtime", ShowtimeSchema);