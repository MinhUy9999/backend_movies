import cloudinary from '../config/cloudinary';
import fs from 'fs';

export class CloudinaryService {
  static async uploadFile(filePath: string, folder: string = 'movie-uploads'): Promise<any> {
    try {
      // Upload file lên Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'auto'
      });
      
      fs.unlinkSync(filePath);
      
      return result;
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }
  
  static async deleteFile(publicId: string): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw error;
    }
  }
}