import { Controller } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentMethod } from '../../../../../libs/enum/payment.enum';
import { Types } from 'mongoose';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @EventPattern('order.created')
  orderCreatedHandler(
    @Payload() data: {
      orderId: string,
      orderCode: string,
      method: PaymentMethod,
      amount: number,
    }
  ) {
    return this.paymentService.create(data);
  }

  // @Post('checkout')
  // @Public()
  // @HttpCode(HttpStatus.NO_CONTENT)
  // checkout(@Body() momoPaymentDto: MomoPaymentDto) {
  //   return this.paymentService.verifyPayment(momoPaymentDto)
  // }
}
