import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { registerMicroserviceClients } from 'libs/microservice-client/register-client';
import { Microservice } from 'libs/enum/microservice.enum';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
    registerMicroserviceClients([
      Microservice.PRODUCT_SERVICE,
      Microservice.PAYMENT_SERVICE,
    ])
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [
    MongooseModule,
    OrdersService,
  ]
})
export class OrdersModule { }
