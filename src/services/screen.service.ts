import { Screen } from "../models/screen.model";
import { Seat } from "../models/seat.model";
import { Showtime } from "../models/showtime.model";
import mongoose from "mongoose";

export class ScreenService {
    async getAllScreens(): Promise<any> {
        return await Screen.find({ isActive: true }).populate("theaterId");
    }

    async getScreenById(id: string): Promise<any> {
        return await Screen.findById(id).populate("theaterId");
    }

    async createScreen(screenData: any): Promise<any> {
        if (!screenData.name || !screenData.theaterId || !screenData.capacity || !screenData.screenType) {
            throw new Error("Missing required screen information");
        }

        const screen = new Screen(screenData);
        await screen.save();

        // Create default seating layout based on capacity
        await this.createDefaultSeats(screen.id, screenData.capacity);

        return screen;
    }

    async updateScreen(id: string, screenData: any): Promise<any> {
        return await Screen.findByIdAndUpdate(
            id,
            { $set: screenData },
            { new: true, runValidators: true }
        );
    }

    async deleteScreen(id: string): Promise<void> {
        const showtimesCount = await Showtime.countDocuments({
            screenId: id,
            startTime: { $gte: new Date() },
            isActive: true,
        });

        if (showtimesCount > 0) {
            // Just mark as inactive instead of deleting
            await Screen.findByIdAndUpdate(id, { isActive: false });
        } else {
            // No future showtimes, can safely delete
            await Screen.findByIdAndDelete(id);
            await Seat.deleteMany({ screenId: id });
        }
    }

    async getScreenSeats(id: string): Promise<any> {
        const seats = await Seat.find({ screenId: id, isActive: true }).sort({
            row: 1,
            seatNumber: 1,
        });

        // Group seats by row
        const seatsByRow: { [key: string]: any[] } = {};

        seats.forEach((seat) => {
            if (!seatsByRow[seat.row]) {
                seatsByRow[seat.row] = [];
            }
            seatsByRow[seat.row].push({
                id: seat._id,
                row: seat.row,
                number: seat.seatNumber,
                type: seat.seatType,
            });
        });

        // Convert to array and sort by row
        return Object.keys(seatsByRow)
            .sort()
            .map((row) => ({
                row,
                seats: seatsByRow[row].sort((a, b) => a.number - b.number),
            }));
    }

    async updateScreenSeats(id: string, seats: any[]): Promise<number> {
        if (!Array.isArray(seats)) {
            throw new Error("Seats must be an array");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Delete existing seats
            await Seat.deleteMany({ screenId: id }, { session });

            // Create new seats
            const seatsToInsert = seats.map((seat) => ({
                screenId: id,
                row: seat.row,
                seatNumber: seat.number,
                seatType: seat.type || "standard",
                isActive: true,
            }));

            await Seat.insertMany(seatsToInsert, { session });

            await session.commitTransaction();
            return seatsToInsert.length;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    private async createDefaultSeats(screenId: mongoose.Types.ObjectId, capacity: number): Promise<void> {
        const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        const seatsPerRow = 10;
        const requiredRows = Math.ceil(capacity / seatsPerRow);
        const rowsToUse = rows.slice(0, requiredRows);

        const seats = [];

        for (const row of rowsToUse) {
            const seatType = row === "A" || row === "B" ? "premium" : "standard";
            for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
                seats.push({
                    screenId,
                    row,
                    seatNumber,
                    seatType,
                    isActive: true,
                });
            }
        }

        await Seat.insertMany(seats);
    }
}