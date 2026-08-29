import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schema/payment.schema';
import { registerMicroserviceClients } from 'libs/microservice-client/register-client';
import { ClientsModule } from '@nestjs/microservices';
import { Microservice } from 'libs/enum/microservice.enum';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentAttempt, PaymentAttemptSchema } from './schema/payment_attempt.schema';
import { OutboxModule } from 'apps/outbox/src/outbox.module';


@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentAttempt.name, schema: PaymentAttemptSchema },
    ]),
    registerMicroserviceClients([
      Microservice.ORDER_SERVICE,
    ]),
    ClientsModule.registerAsync([{
      name: Microservice.KAFKA_SERVICE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const brokers = configService.get<string>('KAFKA_BROKERS');

        return {
          options: {
            client: {
              clientId: 'payment-service-client',
              brokers: brokers
            },
            consumer: {
              groupId: 'payment-client-consumer',
            }
          }
        }
      }
    }]),
    OutboxModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule { }
