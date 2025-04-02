import { Seat, ISeat } from "../models/seat.model";
import webSocketManager from "../patterns/singleton/WebSocketManager";

export class SeatService {
    static async getAllSeats(): Promise<ISeat[]> {
        return await Seat.find();
    }
    // Thêm phương thức này vào SeatService
    static async getSeatsByShowtime(showtimeId: string): Promise<ISeat[]> {
        return await Seat.find({ showtimeId }).sort({ row: 1, seatNumber: 1 });
    }

    static async getSeatById(id: string): Promise<ISeat | null> {
        return await Seat.findById(id);
    }

    static async createSeat(data: Partial<ISeat>): Promise<ISeat> {
        return await Seat.create(data);
    }

    static async updateSeat(id: string, data: Partial<ISeat>): Promise<ISeat | null> {
        const updatedSeat = await Seat.findByIdAndUpdate(id, data, { new: true });

        // If seat is updated and has showtimeId, notify via WebSocket
        if (updatedSeat && updatedSeat.showtimeId) {
            webSocketManager.notifySeatsUpdated(updatedSeat.showtimeId.toString());
        }

        return updatedSeat;
    }

    static async deleteSeat(id: string): Promise<ISeat | null> {
        return await Seat.findByIdAndDelete(id);
    }

    static async reserveSeat(seatId: string, showtimeId: string): Promise<ISeat | null> {
        const seat = await Seat.findOne({ _id: seatId, showtimeId });

        if (!seat) {
            return null;
        }

        if (seat.status !== 'available') {
            throw new Error("Seat is already reserved");
        }

        seat.status = 'reserved';
        seat.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute reservation

        const updatedSeat = await seat.save();

        // Notify via WebSocket about seats update
        webSocketManager.notifySeatsUpdated(showtimeId);

        return updatedSeat;
    }

    static async bookSeat(seatId: string, showtimeId: string, bookingId: string): Promise<ISeat | null> {
        const seat = await Seat.findOneAndUpdate(
            { _id: seatId, showtimeId },
            {
                status: 'booked',
                bookingId,
                $unset: { expiresAt: 1 }
            },
            { new: true }
        );

        if (seat) {
            // Notify via WebSocket about seats update
            webSocketManager.notifySeatsUpdated(showtimeId);
        }

        return seat;
    }

    static async releaseSeat(seatId: string, showtimeId: string): Promise<ISeat | null> {
        const seat = await Seat.findOneAndUpdate(
            { _id: seatId, showtimeId },
            {
                status: 'available',
                $unset: { bookingId: 1, expiresAt: 1 }
            },
            { new: true }
        );

        if (seat) {
            // Notify via WebSocket about seats update
            webSocketManager.notifySeatsUpdated(showtimeId);
        }

        return seat;
    }

    // Phương thức mới: Đánh dấu tất cả các ghế đã hết hạn là available
    static async releaseExpiredSeats(): Promise<void> {
        const now = new Date();
        const expiredSeats = await Seat.find({
            status: 'reserved',
            expiresAt: { $lt: now }
        });

        for (const seat of expiredSeats) {
            await Seat.updateOne(
                { _id: seat._id },
                {
                    status: 'available',
                    $unset: { bookingId: 1, expiresAt: 1 }
                }
            );

            if (seat.showtimeId) {
                // Notify via WebSocket about seats update
                webSocketManager.notifySeatsUpdated(seat.showtimeId.toString());
            }
        }
    }
}