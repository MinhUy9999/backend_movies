import { Seat, ISeat } from "../models/seat.model";
import { webSocketManager } from "../patterns/singleton/WebSocketManager"; // Import WebSocketManager

export class SeatService {
    static async getAllSeats(): Promise<ISeat[]> {
        return await Seat.find();
    }

    static async getSeatById(id: string): Promise<ISeat | null> {
        return await Seat.findById(id);
    }

    static async createSeat(data: Partial<ISeat>): Promise<ISeat> {
        return await Seat.create(data);
    }

    static async updateSeat(id: string, data: Partial<ISeat>): Promise<ISeat | null> {
        const updatedSeat = await Seat.findByIdAndUpdate(id, data, { new: true });
        
        // Nếu cập nhật thành công và có showtimeId, thông báo qua WebSocket
        if (updatedSeat && updatedSeat.showtimeId) {
            webSocketManager.notifySeatStatusChanged(
                updatedSeat.showtimeId.toString(),
                {
                    seatId: updatedSeat._id,
                    status: updatedSeat.status,
                    row: updatedSeat.row,
                    seatNumber: updatedSeat.seatNumber
                }
            );
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
            throw new Error("Ghế này đã được đặt");
        }
        
        seat.status = 'reserved';
        seat.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute reservation
        
        const updatedSeat = await seat.save();
        
        // Thông báo qua WebSocket
        webSocketManager.notifySeatStatusChanged(
            showtimeId,
            {
                seatId: updatedSeat._id,
                status: 'reserved',
                row: updatedSeat.row,
                seatNumber: updatedSeat.seatNumber
            }
        );
        
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
            // Thông báo qua WebSocket
            webSocketManager.notifySeatStatusChanged(
                showtimeId,
                {
                    seatId: seat._id,
                    status: 'booked',
                    row: seat.row,
                    seatNumber: seat.seatNumber
                }
            );
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
            // Thông báo qua WebSocket
            webSocketManager.notifySeatStatusChanged(
                showtimeId,
                {
                    seatId: seat._id,
                    status: 'available',
                    row: seat.row,
                    seatNumber: seat.seatNumber
                }
            );
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
                // Thông báo qua WebSocket
                webSocketManager.notifySeatStatusChanged(
                    seat.showtimeId.toString(),
                    {
                        seatId: seat._id,
                        status: 'available',
                        row: seat.row,
                        seatNumber: seat.seatNumber
                    }
                );
            }
        }
    }
}