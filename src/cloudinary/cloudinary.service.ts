import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
    async uploadFile(file: Express.Multer.File, folderName: string = 'nest-uploads'): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    resource_type: 'auto',
                },
                (error: UploadApiErrorResponse, result: UploadApiResponse) => {
                    if (error) return reject(new BadRequestException('[Cloudinary] Failed to upload media: ' + error.message));
                    resolve(result);
                },
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }

    generateUploadSignature() {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const signature = cloudinary.utils.api_sign_request(
            { timestamp, folder: 'bulk_products' },
            process.env.CLOUDINARY_API_SECRET!
        );

        return {
            signature,
            timestamp,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_NAME,
        };
    }
}