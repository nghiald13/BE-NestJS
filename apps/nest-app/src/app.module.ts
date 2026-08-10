import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
// import { UsersModule } from './modules/users/users.module';
// import { AuthModule } from '../../auth-service/modules/auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
// import { JwtAuthGuard } from '../../auth-service/modules/auth/passport/jwt-auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { TransformInterceptor } from '../../api-gateway/src/common/transform.interceptor';
import { ProductsModule } from './modules/products/products.module';
import { PaymentModule } from './payment/payment.module';
import { OrdersModule } from './modules/orders/orders.module';
import * as dns from 'dns';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import KeyvRedis from '@keyv/redis';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        //Force IPv4 Connection
        family: 4,
      }),
      inject: [ConfigService],
    }),

    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const store = new KeyvRedis(
          configService.get<string>('REDIS_URL'),

        )
        return {
          stores: [store],
          ttl: +configService.get<string>('CACHE_TTL')
        }
      }

    }),

    ProductsModule,

    PaymentModule,

    OrdersModule,

    AdminModule,

  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule { }
