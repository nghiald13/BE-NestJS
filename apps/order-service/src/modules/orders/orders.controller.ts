import { Controller } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @MessagePattern({ cmd: 'order.findByUserId' })
  findByUserId(@Payload() userId: string) {
    return this.ordersService.findByUserId(userId);
  }

  @MessagePattern({ cmd: 'order.findOne' })
  findOne(@Payload() id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern({ cmd: 'order.create' })
  create(@Payload() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  

  // @MessagePattern({ cmd: 'order.update-status' })
  // async updateStatus(@Payload() payload: UpdateOrderStatusPayload) {
  //   return this.ordersService.updateOrderStatus(payload);
  // }

  // @MessagePattern({ cmd: 'order.get-details-by-code' })
  // async getDetailsByCode(@Payload() { orderCode }: { orderCode: string }) {
  //   return this.ordersService.getOrderDetailsByCode(orderCode);
  // }
}
