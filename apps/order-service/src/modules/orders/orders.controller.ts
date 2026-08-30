import { Controller } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { KafkaEvent, TCPMessage } from 'libs/decorator/microservice-pattern.decorator';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @TCPMessage('order.findByUserId')
  findByUserId(@Payload() userId: string) {
    return this.ordersService.findByUserId(userId);
  }

  @TCPMessage('order.findOne' )
  findOne(@Payload() id: string) {
    return this.ordersService.findOne(id);
  }

  @TCPMessage('order.create')
  create(@Payload() { idempotencyKey, dto }: { idempotencyKey: string, dto: CreateOrderDto }) {
    return this.ordersService.create({ idempotencyKey, dto });
  }

  @KafkaEvent('payment.success')
  paymentSuccessHandler(@Payload() { orderId }: { orderId: string }) {
    return this.ordersService.paymentSuccessHandler({orderId});
  }

  // @TCPMessage({ cmd: 'order.update-status' })
  // async updateStatus(@Payload() payload: UpdateOrderStatusPayload) {
  //   return this.ordersService.updateOrderStatus(payload);
  // }

  // @TCPMessage({ cmd: 'order.get-details-by-code' })
  // async getDetailsByCode(@Payload() { orderCode }: { orderCode: string }) {
  //   return this.ordersService.getOrderDetailsByCode(orderCode);
  // }
}
