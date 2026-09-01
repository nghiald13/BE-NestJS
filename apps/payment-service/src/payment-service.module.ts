import { Module } from '@nestjs/common';
import { PaymentModule } from './modules/payment/payment.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullMQModule } from 'libs/shared-modules/bullmq/bullmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PaymentModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    // BullMQ
    BullMQModule,
  ],
  controllers: [],
  providers: [],
})
export class PaymentServiceModule { }
