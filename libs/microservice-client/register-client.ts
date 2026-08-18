
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createTcpClientOptions } from './create-client-options';
import { Microservice } from 'libs/enum/microservice.enum';

export function registerMicroserviceClients(names: Microservice[]) {
    return ClientsModule.registerAsync(
        names.map((name) => ({
            name,
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) =>
                createTcpClientOptions(configService, name),
            inject: [ConfigService],
        })),
    );
}