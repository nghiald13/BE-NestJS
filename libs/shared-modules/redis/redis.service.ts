import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
    ) { }

    async setNLock(key: string, value: any, ttlMs: number = 30000): Promise<boolean> {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        const result = await this.redisClient.set(key, stringValue, {
            NX: true,
            PX: ttlMs,
        });

        return result === 'OK';
    }

    async release(key: string): Promise<void> {
        await this.redisClient.del(key);
    }
}