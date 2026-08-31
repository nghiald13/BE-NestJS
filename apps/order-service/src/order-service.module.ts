import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './modules/orders/orders.module';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from 'node_modules/@keyv/redis/dist/index.cjs';
import { RedisModule } from 'libs/shared-modules/redis/redis.module';
import { BullMQModule } from 'libs/shared-modules/bullmq/bullmq.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from 'apps/outbox/src/outbox.module';

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

    // CacheModule
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

    // RedisClient Module
    RedisModule,

    // BullMQ Module
    BullMQModule,
    
    OrdersModule,
  ],
  controllers: [],
  providers: [],
})
export class OrderServiceModule { }
