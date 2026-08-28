import { NestFactory } from '@nestjs/core';
import { ProductServiceModule } from './product-service.module';
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    ProductServiceModule,
    {
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: Transport.TCP,
        options: {
          host: configService.get('HOST', 'localhost'),
          port: +configService.get('PRODUCT_SERVICE_PORT', 8083)
        }
      })
    });
  await app.listen();
}
bootstrap();
