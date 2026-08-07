
import { Controller, Inject, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('media')
export class MediaGatewayController {
    constructor(@Inject('MEDIA_SERVICE') private readonly mediaClient: ClientProxy) { }

    @Get('generateUploadSignature')
    getUploadSignature() {
        return this.mediaClient.send({cmd: 'cloudinary_generate_upload_signature'}, {})
    }
}