import { NestFactory } from '@nestjs/core';
import { KafkaModule } from './kafka.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(KafkaModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      }
    }
  });
  await app.listen();
}
bootstrap();
