import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './auth/passport/jwt-auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { TransformInterceptor } from './core/transform.interceptor';
import { ProductsModule } from './modules/products/products.module';
import { PaymentModule } from './payment/payment.module';
import { OrdersModule } from './modules/orders/orders.module';
import * as dns from 'dns';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { KeyvCacheableMemory } from 'cacheable';
import { deserialize, serialize } from 'v8';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        //Force IPv4 Connection
        family: 4,
      }),
      inject: [ConfigService],
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: +config.get('MAIL_PORT'),
          secure: false,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },

          lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { ...options, family: 4 }, (err, address, family) => {
              callback(err, address, family);
            });
          },

          tls: {
            rejectUnauthorized: false
          }
        },
        defaults: {
          from: config.get('MAIL_FROM'),
        },
        template: {
          dir: join(__dirname, 'mailer', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
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

    CloudinaryModule,

  ],
  controllers: [AppController],
  providers: [
    AppService,
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
export class AppModule { }
