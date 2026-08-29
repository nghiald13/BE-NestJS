import { NestFactory } from '@nestjs/core';
import { ProductServiceModule } from './product-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(ProductServiceModule);
  const configService = app.get(ConfigService);

  const host = configService.get('HOST', 'localhost');
  const port = +configService.get('PRODUCT_SERVICE_PORT', 8083);
  const kafkaBroker = configService.get('KAFKA_BROKERS', 'localhost:9092');

  console.log('========== PAYMENT SERVICE CONFIG ==========');
  console.log('HOST:', host);
  console.log('TCP PORT:', port);
  console.log('KAFKA BROKER:', kafkaBroker);
  console.log('==========================================');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host,
      port,
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'product-service-consumer',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'product-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  console.log('========== PRODUCT SERVICE STARTED ==========');
}
bootstrap();
