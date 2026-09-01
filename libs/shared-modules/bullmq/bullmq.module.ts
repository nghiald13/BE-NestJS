import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const redisUrl = configService.get<string>('REDIS_URL');

                if (redisUrl) {
                    const url = new URL(redisUrl);
                    return {
                        connection: {
                            host: url.hostname,
                            port: Number(url.port) || 6379,
                            username: url.username || undefined,
                            password: url.password || undefined,
                            tls: url.protocol === 'rediss:' ? {} : undefined,
                        },
                    };
                }

                return {
                    connection: {
                        host: configService.get<string>('REDIS_HOST') || 'localhost',
                        port: +configService.get<number>('REDIS_PORT') || 6379,
                        password: configService.get<string>('REDIS_PASSWORD') || undefined,
                    },
                };
            },
        }),
    ],
    exports: [BullModule],
})
export class BullMQModule { }