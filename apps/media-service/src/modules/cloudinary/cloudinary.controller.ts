import { Controller } from "@nestjs/common"
import { CloudinaryService } from "./cloudinary.service"
import { MessagePattern } from "@nestjs/microservices"

@Controller()
export class CloudinaryController {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    // Listen to message pattern "generate_upload_signature" sent from gateway
    @MessagePattern({ cmd: 'cloudinary_generate_upload_signature' })
    async generateUploadSignature() {
        return this.cloudinaryService.generateUploadSignature()
    }

}