import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { PaymentMethod } from "libs/enum/payment.enum";
import { firstValueFrom } from "rxjs";
import { Public } from "../decorators/decor";

@Controller('payment')
export class PaymentGatewayController {
    constructor(
        @Inject('PAYMENT_SERVICE')
        private readonly paymentClient: ClientProxy,


    ) {}

    @Post('pay')
    pay (@Body() dto: {orderId: string, method: PaymentMethod}) {
        return firstValueFrom(this.paymentClient.send('payment.pay', dto));
    }

    @Post('zalo/callback')
    @Public()
    @HttpCode(HttpStatus.OK)
    zaloPayCallback(@Body() {data, mac}: {data: string, mac: string}) {
        return firstValueFrom(this.paymentClient.send('payment.zalo.callback', {data, mac}));
    }
}