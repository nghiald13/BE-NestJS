import { MessagePattern, EventPattern, Transport } from '@nestjs/microservices';

export const TCPMessage = (pattern: string | object) =>
    MessagePattern(pattern, Transport.TCP);

export const KafkaEvent = (pattern: string) =>
    EventPattern(pattern, Transport.KAFKA);