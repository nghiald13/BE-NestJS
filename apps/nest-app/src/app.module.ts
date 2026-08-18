import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from '../../product-service/src/modules/products/products.module';
import { PaymentModule } from '../../payment-service/src/modules/payment/payment.module';
import { OrdersModule } from '../../order-service/src/modules/orders/orders.module';
import { AdminModule } from './admin/admin.module';
import KeyvRedis from '@keyv/redis';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        //Force IPv4 Connection
        family: 4,
      }),
      inject: [ConfigService],
    }),

    ProductsModule,

    PaymentModule,

    OrdersModule,

    AdminModule,

  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule { }
