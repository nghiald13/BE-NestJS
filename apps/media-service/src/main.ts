import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MediaServiceModule } from './media-service.module';

async function bootstrap() {
  const host: string = process.env.HOST;
  const port: number = +process.env.MEDIA_SERVICE_PORT;
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    MediaServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: host,
        port: port,
      }
    },
  );

  await app.listen();
  console.log(`Media Service started on ${host}:${port}`)
}
bootstrap();
