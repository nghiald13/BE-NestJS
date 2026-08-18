import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { CreatePaymentDto } from "apps/payment-service/src/modules/payment/dto/create-payment.dto";

@Controller('payment')
export class PaymentGatewayController {
    constructor(
        @Inject('PAYMENT_SERVICE')
        private readonly paymentClient: ClientProxy,


    ) {}

    // @Post('momo/create')
    // create(@Body() dto: CreatePaymentDto) {
    //     return this.paymentClient.send({cmd: 'payment.create'}, dto);
    // }
}