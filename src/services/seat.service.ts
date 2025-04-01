import { Seat, ISeat } from "../models/seat.model";

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
        return await Seat.findByIdAndUpdate(id, data, { new: true });
    }

    static async deleteSeat(id: string): Promise<ISeat | null> {
        return await Seat.findByIdAndDelete(id);
    }
}
