
import { ConfigService } from '@nestjs/config';
import { Transport, TcpClientOptions } from '@nestjs/microservices';
import { Microservice } from 'libs/enum/microservice.enum';

export function createTcpClientOptions(
    configService: ConfigService,
    servicePrefix: Microservice, // VD: 'ORDER_SERVICE'
): TcpClientOptions {
    return {
        transport: Transport.TCP,
        options: {
            host: configService.get<string>(`${servicePrefix}_HOST`),
            port: configService.get<number>(`${servicePrefix}_PORT`),
        },
    };
}