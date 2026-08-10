
import { Controller, Inject, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Public } from '../decorators/decor';

@Controller('media')
export class MediaGatewayController {
    constructor(@Inject('MEDIA_SERVICE') private readonly mediaClient: ClientProxy) { }

    @Get('generateUploadSignature')
    @Public()
    getUploadSignature() {
        return this.mediaClient.send({cmd: 'cloudinary_generate_upload_signature'}, {})
    }
}