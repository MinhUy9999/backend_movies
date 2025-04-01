import { Theater } from "../models/theater.model";
import { Screen } from "../models/screen.model";

export class TheaterService {
    async getAllTheaters(): Promise<any> {
        return await Theater.find({ isActive: true });
    }

    async getTheaterById(id: string): Promise<any> {
        return await Theater.findById(id);
    }

    async createTheater(theaterData: any): Promise<any> {
        // Bỏ kiểm tra totalScreens
        if (!theaterData.name || !theaterData.location) {
            throw new Error("Missing required theater information");
        }
        const theater = new Theater(theaterData);
        return await theater.save();
    }

    async updateTheater(id: string, theaterData: any): Promise<any> {
        return await Theater.findByIdAndUpdate(
            id,
            { $set: theaterData },
            { new: true, runValidators: true }
        );
    }

    async deleteTheater(id: string): Promise<void> {
        const screensCount = await Screen.countDocuments({ theaterId: id });
        if (screensCount > 0) {
            await Theater.findByIdAndUpdate(id, { isActive: false });
        } else {
            await Theater.findByIdAndDelete(id);
        }
    }

    async getTheaterScreens(id: string): Promise<any> {
        return await Screen.find({ theaterId: id, isActive: true });
    }
}