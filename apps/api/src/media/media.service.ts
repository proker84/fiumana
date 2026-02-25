import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class MediaService {
  private uploadDir: string;
  private isCloudinaryConfigured: boolean;

  constructor(private config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    this.isCloudinaryConfigured = !!(cloudName && apiKey && apiSecret);

    if (this.isCloudinaryConfigured) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    }

    this.uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File) {
    return this.uploadImage(file, 'general');
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'images'): Promise<{ url: string }> {
    if (this.isCloudinaryConfigured) {
      const result = await this.uploadToCloudinary(file, `immobiliare-fiumana/${folder}`, 'image');
      return { url: result.secure_url };
    }

    return this.uploadLocally(file, folder);
  }

  async uploadVideo(file: Express.Multer.File, folder: string = 'videos'): Promise<{ url: string }> {
    if (this.isCloudinaryConfigured) {
      const result = await this.uploadToCloudinary(file, `immobiliare-fiumana/${folder}`, 'video');
      return { url: result.secure_url };
    }

    return this.uploadLocally(file, folder);
  }

  async uploadAudio(file: Express.Multer.File, folder: string = 'audio'): Promise<{ url: string }> {
    if (this.isCloudinaryConfigured) {
      const result = await this.uploadToCloudinary(file, `immobiliare-fiumana/${folder}`, 'raw');
      return { url: result.secure_url };
    }

    return this.uploadLocally(file, folder);
  }

  async deleteImage(url: string): Promise<void> {
    if (!url) return;

    if (this.isCloudinaryConfigured && url.includes('cloudinary')) {
      const publicId = this.extractCloudinaryPublicId(url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error('Failed to delete from Cloudinary:', error);
        }
      }
    } else if (url.startsWith('/uploads/')) {
      const filePath = join(this.uploadDir, url.replace('/uploads/', ''));
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch (error) {
          console.error('Failed to delete local file:', error);
        }
      }
    }
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
    resourceType: 'image' | 'video' | 'raw' | 'auto',
  ): Promise<UploadApiResponse> {
    // If file has a path (from multer disk storage)
    if (file.path) {
      return cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: resourceType,
      });
    }

    // If file has buffer (from multer memory storage)
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  private uploadLocally(file: Express.Multer.File, folder: string): { url: string } {
    const folderPath = join(this.uploadDir, folder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = join(folderPath, filename);

    if (file.buffer) {
      writeFileSync(filePath, file.buffer);
    }

    return {
      url: `/uploads/${folder}/${filename}`,
    };
  }

  private extractCloudinaryPublicId(url: string): string | null {
    try {
      // Extract public_id from Cloudinary URL
      // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
