import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    AuthServiceModule,
    {
      useFactory: (configService: ConfigService) => ({
        transport: Transport.TCP,
        options: {
          host: configService.get('HOST', 'localhost'),
          port: +configService.get('AUTH_SERVICE_PORT', 8082),
        },
      }),
      inject: [ConfigService],
    },
  );


  await app.listen();
}
bootstrap();
