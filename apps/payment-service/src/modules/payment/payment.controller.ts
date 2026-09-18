import { Controller } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ZaloPayService } from './zalopay.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentMethod } from '../../../../../libs/enum/payment.enum';
import { KafkaEvent } from 'libs/decorator/microservice-pattern.decorator';

@Controller()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly zaloPayService: ZaloPayService,
  ) { }

  @MessagePattern('payment.pay')
  pay(@Payload() data: { orderId: string, method: PaymentMethod }) {
    return this.paymentService.pay(data);
  }

  @MessagePattern('payment.zalo.callback')
  zaloPayCallbackHandler(@Payload() { data, mac }: { data: string, mac: string }) {
    return this.zaloPayService.zaloPayCallbackHandler({ data, mac });
  }

  @MessagePattern('payment.query-status')
  queryStatus(@Payload() { orderId }: { orderId: string }) {
    return this.paymentService.queryStatus(orderId);
  }

  // ===================== Events from Order =====================
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

  @KafkaEvent('order.cancelled')
  orderCancelledHandler(@Payload() {orderId}: {orderId: string}) {
    return this.paymentService.cancel(orderId);
  }
}
