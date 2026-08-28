import { NestFactory } from '@nestjs/core';
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { MediaServiceModule } from './media-service.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    MediaServiceModule,
    {
      useFactory: (configService: ConfigService) => ({
        transport: Transport.TCP,
        options: {
          host: configService.get('HOST'),
          port: +configService.get('MEDIA_SERVICE_PORT'),
        }
      }),
      inject: [ConfigService],
    },
  );

  await app.listen();
}
bootstrap();
