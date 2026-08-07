import { Controller, Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Controller('auth')
export class AuthGatewayController {
    constructor(
        @Inject('AUTH_SERVICE')
        private readonly authClient: ClientProxy
    ) {}

    
}