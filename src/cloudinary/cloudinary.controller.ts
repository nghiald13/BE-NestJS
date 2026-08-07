import { Body, Controller, Get, Post } from "@nestjs/common"
import { CloudinaryService } from "./cloudinary.service"

@Controller(`cloudinary`)
export class CloudinaryController {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    @Get(`/generateUploadSignature`)
    async generateUploadSignature() {
        return this.cloudinaryService.generateUploadSignature()
    }

}