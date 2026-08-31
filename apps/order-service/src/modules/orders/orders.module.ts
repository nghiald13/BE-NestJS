import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { registerMicroserviceClients } from 'libs/microservice-client/register-client';
import { Microservice } from 'libs/enum/microservice.enum';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { OutboxModule } from 'apps/outbox/src/outbox.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
    registerMicroserviceClients([
      Microservice.PRODUCT_SERVICE,
      // Microservice.PAYMENT_SERVICE,
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
              clientId: 'order-service-client',
              brokers: brokers
            },
            consumer: {
              groupId: 'order-client-consumer',
            }
          }
        }
      }
    }]),

    // Outbox - Kafka Module
    ScheduleModule.forRoot(),
    OutboxModule,

    // BullMQ
    BullModule.registerQueue({
      name: 'ORDER_QUEUE',
    })


  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [
    MongooseModule,
    OrdersService,
    // OrderProcessor,
  ]
})
export class OrdersModule { }
