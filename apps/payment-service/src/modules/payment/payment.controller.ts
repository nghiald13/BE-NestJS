import { Controller } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentMethod } from '../../../../../libs/enum/payment.enum';
import { Types } from 'mongoose';
import { KafkaEvent } from 'libs/decorator/microservice-pattern.decorator';
import { request } from 'http';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @KafkaEvent('order.created')
  orderCreatedHandler(
    @Payload() data: {
      orderId: string,
      method: PaymentMethod,
      amount: number,
    }
  ) {
    return this.paymentService.create(data);
  }

  @MessagePattern('payment.pay')
  pay(@Payload() data: { orderId: string, method: PaymentMethod }) {
    return this.paymentService.pay(data);
  }

  @MessagePattern('payment.zalo.callback')
  zaloPayCallbackHandler(@Payload() { data, mac }: { data: string, mac: string }) {
    return this.paymentService.zaloPayCallbackHandler({ data, mac });
  }

  // @Post('checkout')
  // @Public()
  // @HttpCode(HttpStatus.NO_CONTENT)
  // checkout(@Body() momoPaymentDto: MomoPaymentDto) {
  //   return this.paymentService.verifyPayment(momoPaymentDto)
  // }
}
