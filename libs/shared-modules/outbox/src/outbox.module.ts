
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox.schema';
import { OutboxWorkerService } from './outbox.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }]),

    ClientsModule.registerAsync([
      {
        name: 'KAFKA_OUTBOX_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'order-service-outbox',
              brokers: [config.get('KAFKA_BROKERS', 'localhost:9092')],
            },
          },
        }),
      },
    ]),
  ],
  providers: [OutboxWorkerService],
  exports: [MongooseModule],
})
export class OutboxModule { }