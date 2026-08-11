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

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PassportModule,

    ClientsModule.registerAsync([
      {
        name: 'MEDIA_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('HOST'),
            port: +configService.get('MEDIA_SERVICE_PORT', 8081),
          }
        }),
        inject: [ConfigService],
      },
      {
        name: 'AUTH_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('HOST'),
            port: +configService.get('AUTH_SERVICE_PORT', 8082),
          }
        }),
        inject: [ConfigService],
      },
      {
        inject: [ConfigService],
        name: 'PRODUCT_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('HOST'),
            port: +configService.get('PRODUCT_SERVICE_PORT', 8083)
          }
        }),
      },
    ]),
  ],
  controllers: [
    ApiGatewayController,
    MediaGatewayController,
    AuthGatewayController,
    ProductGatewayController,
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
