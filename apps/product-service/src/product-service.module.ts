import { Module } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from 'node_modules/@keyv/redis/dist/index.cjs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
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
  ],
  controllers: [],
  providers: [],
})
export class ProductServiceModule { }
