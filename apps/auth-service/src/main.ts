import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const host: string = process.env.HOST;
  const port: number = +process.env.AUTH_SERVICE_PORT;
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: host,
        port: port,
      },
    },
  );


  await app.listen();
  console.log(`Auth Service started on ${host}:${port}`)
}
bootstrap();
