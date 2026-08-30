import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  const configService = app.get(ConfigService);

  const host = configService.get('HOST', 'localhost');
  const port = +configService.get('ORDER_SERVICE_PORT', 8084);
  const kafkaBroker = configService.get('KAFKA_BROKERS', 'localhost:9092');

  console.log('========== ORDER SERVICE CONFIG ==========');
  console.log('HOST:', host);
  console.log('PORT:', port);
  console.log('KAFKA BROKER:', kafkaBroker);
  console.log('==========================================');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host, port },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'order-service-consumer',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'order-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  console.log('========== ORDER SERVICE STARTED ==========');
}
bootstrap();