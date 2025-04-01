import mongoose, { Schema, Document } from "mongoose";

export interface IMovie extends Document {
  title: string;
  description: string;
  duration: number;
  genre: string[];
  language: string;
  releaseDate: Date;
  endDate: Date;
  director: string;
  cast: string[];
  rating: number;
  posterUrl: string;
  posterPublicId?: string; 
  trailerUrl: string;
  trailerPublicId?: string; 
  isActive: boolean;
}

const MovieSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  genre: [{ type: String, required: true }],
  language: { type: String, required: true },
  releaseDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  director: { type: String, required: true },
  cast: [{ type: String }],
  rating: { type: Number, default: 0, min: 0, max: 10 },
  posterUrl: { type: String },
  posterPublicId: { type: String }, 
  trailerUrl: { type: String },
  trailerPublicId: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Movie = mongoose.model<IMovie>("Movie", MovieSchema);
