import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MediaGatewayController } from './controllers/media.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGatewayController } from './controllers/auth.controller';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { TransformInterceptor } from './common/transform.interceptor';
import { LocalStrategy } from './passport/local.strategy';
import { JwtStrategy } from './passport/jwt-access.strategy';
import { JwtRefreshStrategy } from './passport/jwt-refresh.strategy';
import { PassportModule } from '@nestjs/passport';
import { ProductGatewayController } from './controllers/product.controller';
import { OrderGatewayController } from './controllers/order.controller';
import { PaymentGatewayController } from './controllers/payment.controller';
import { registerMicroserviceClients } from 'libs/microservice-client/register-client';
import { Microservice } from 'libs/enum/microservice.enum';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PassportModule,

    registerMicroserviceClients([
      Microservice.MEDIA_SERVICE,
      Microservice.AUTH_SERVICE,
      Microservice.PRODUCT_SERVICE,
      Microservice.ORDER_SERVICE,
      Microservice.PAYMENT_SERVICE,
    ]),

    // KAFKA client register
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'api-gateway',
              brokers: [configService.get('KAFKA_BROKER', 'localhost:9092')]
            },
            consumer: {
              groupId: 'gateway-consumer'
            }
          }
        }),
      },
    ])
  ],
  controllers: [
    ApiGatewayController,
    MediaGatewayController,
    AuthGatewayController,
    ProductGatewayController,
    OrderGatewayController,
    PaymentGatewayController,
  ],
  providers: [
    ApiGatewayService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class ApiGatewayModule { }
