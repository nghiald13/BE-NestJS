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
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRES')
        },
      }),
      inject: [ConfigService],
    }),

    PassportModule,

    ClientsModule.registerAsync([
      {
        name: 'MEDIA_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('HOST'),
            port: +configService.get('MEDIA_SERVICE_PORT'),
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
            port: +configService.get('AUTH_SERVICE_PORT'),
          }
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    ApiGatewayController,
    MediaGatewayController,
    AuthGatewayController
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
