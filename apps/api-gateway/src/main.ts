import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { AllExceptionsFilter } from './common/rpc-exception.filter';
import cookieParser from 'cookie-parser';

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

  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(cookieParser())

  app.enableCors({
    origin: true,
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE",
    preflightContinue: false,
    credentials: true,
  });


  await app.listen(port);
  console.log(`Api Gateway start on ${host}:${port}`);
}
bootstrap();
