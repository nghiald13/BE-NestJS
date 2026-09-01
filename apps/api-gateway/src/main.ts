import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { RpcExceptionFilter } from './common/rpc-exception.filter';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const host: string = process.env.HOST;
  const port: number = +process.env.API_GATEWAY_PORT;
  const app = await NestFactory.create(ApiGatewayModule);

  // Activates Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    // forbidNonWhitelisted: true,
    // skipUndefinedProperties: true,
  }));

  // Prefix url
  app.setGlobalPrefix('api/v1', {
    exclude: [
      ''
    ],
  })

  // RcpExceptionFilter for Observable Response from microservices
  app.useGlobalFilters(new RpcExceptionFilter());

  // Cookie Parser
  app.use(cookieParser())

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE",
    preflightContinue: false,
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('MECSU API')
    .setDescription('API Gateway for microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`Api Gateway start on ${host}:${port}`);
}
bootstrap();
