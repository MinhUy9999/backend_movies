import mongoose, { Schema, Document } from "mongoose";

export interface IScreen extends Document {
  name: string;
  theaterId: mongoose.Types.ObjectId;
  capacity: number;
  screenType: "standard" | "imax" | "vip" | "4dx";
  isActive: boolean;
}

const ScreenSchema: Schema = new Schema({
  name: { type: String, required: true },
  theaterId: { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
  capacity: { type: Number, required: true, min: 1 },
  screenType: { type: String, enum: ["standard", "imax", "vip", "4dx"], default: "standard" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Screen = mongoose.model<IScreen>("Screen", ScreenSchema);
