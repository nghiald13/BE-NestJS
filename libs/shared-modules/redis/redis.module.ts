import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { RedisService } from './redis.service';

const REDIS_CLIENT = 'REDIS_CLIENT';

const redisProvider: Provider = {
    provide: REDIS_CLIENT,
    useFactory: async (configService: ConfigService): Promise<RedisClientType> => {
        const client = createClient({
            url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        });

        client.on('error', (err) => console.error('Redis Client Error:', err));
        await client.connect();
        return client as RedisClientType;
    },
    inject: [ConfigService],
};

@Global()
@Module({
    providers: [redisProvider, RedisService],
    exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule { }