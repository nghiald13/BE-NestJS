import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment-service.module';
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    PaymentServiceModule,
    {
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('HOST', 'localhost');
        const port = +configService.get('PAYMENT_SERVICE_PORT', 8085);

        console.log('========== PAYMENT SERVICE CONFIG ==========');
        console.log('HOST:', host);
        console.log('PORT:', port);
        console.log('==========================================');

        return {
          transport: Transport.TCP,
          options: {
            host,
            port,
          }
        }
      }
    }
  );
  await app.listen();
  console.log('========== PAYMENT SERVICE STARTED ==========');
}
bootstrap();
