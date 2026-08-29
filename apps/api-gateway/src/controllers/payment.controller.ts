import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { CreatePaymentDto } from "apps/payment-service/src/modules/payment/dto/create-payment.dto";
import { PaymentMethod } from "libs/enum/payment.enum";
import { firstValueFrom } from "rxjs";
import { Public } from "../decorators/decor";
import { request } from "node:http";

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

    @Post('zalo')
    @Public()
    zalo () {
        return firstValueFrom(this.paymentClient.send('payment.zalo', {}))
    }

    @Post('zalo/callback')
    @Public()
    @HttpCode(HttpStatus.OK)
    zaloPayCallback(@Body() {data, mac}: {data: string, mac: string}) {
        // const data = JSON.parse(request.data);
        // console.log(`Received callback from zalo, requestBody: ${data}`);
        // return {
        //     return_code: 1,
        //     return_message: "Received callback"
        // }
        return firstValueFrom(this.paymentClient.send('payment.zalo.callback', {data, mac}));
    }
    // @Post('momo/create')
    // create(@Body() dto: CreatePaymentDto) {
    //     return this.paymentClient.send({cmd: 'payment.create'}, dto);
    // }
}