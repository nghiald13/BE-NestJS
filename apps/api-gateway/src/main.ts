import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap() {
  const host: string = process.env.HOST;
  const port: number = +process.env.API_GATEWAY_PORT;
  const app = await NestFactory.create(ApiGatewayModule);

  //Config
  app.setGlobalPrefix('api/v1', {
    exclude: [
      ''
    ],
  })


  await app.listen(port);
  console.log(`Api Gateway start on ${host}:${port}`);
}
bootstrap();
