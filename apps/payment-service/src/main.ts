import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(PaymentServiceModule);
  const configService = app.get(ConfigService);

  const host = configService.get('HOST', 'localhost');
  const port = +configService.get('PAYMENT_SERVICE_PORT', 8085);
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
        clientId: 'payment-service-consumer',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'payment-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.init();
  console.log('========== PAYMENT SERVICE STARTED ==========');
}
bootstrap();
