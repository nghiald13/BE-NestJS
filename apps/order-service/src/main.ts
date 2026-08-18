import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    OrderServiceModule,
    {
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('HOST', 'localhost');
        const port = +configService.get('ORDER_SERVICE_PORT', 8084);

        console.log('========== ORDER SERVICE CONFIG ==========');
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
      },
    }
  );

  await app.listen();
  console.log('========== ORDER SERVICE STARTED ==========');
}
bootstrap();
