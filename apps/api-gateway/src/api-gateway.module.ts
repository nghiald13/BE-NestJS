import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MediaGatewayController } from './controllers/media.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ClientsModule.register([
      {
        name: 'MEDIA_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.HOST,
          port: +process.env.MEDIA_SERVICE_PORT,
        }
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.HOST,
          port: +process.env.AUTH_SERVICE_PORT,
        }
      },
    ]),
  ],
  controllers: [
    ApiGatewayController,
    MediaGatewayController,
  ],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
