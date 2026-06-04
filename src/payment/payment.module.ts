import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { OrdersModule } from '../modules/orders/orders.module';
import { ProductsModule } from '../modules/products/products.module';


@Module({
  imports: [
    HttpModule,
    OrdersModule,
    ProductsModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule { }
