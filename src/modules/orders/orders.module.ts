import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrderDetails, OrderDetailsSchema } from './schema/order_detail.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderDetails.name, schema: OrderDetailsSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [
    MongooseModule,
    OrdersService,
  ]
})
export class OrdersModule {}
