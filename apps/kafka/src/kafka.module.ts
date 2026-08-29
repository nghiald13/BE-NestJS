import { Module } from '@nestjs/common';
import { KafkaController } from './kafka.controller';
import { KafkaService } from './kafka.service';

@Module({
  imports: [],
  controllers: [KafkaController],
  providers: [KafkaService],
})
export class KafkaModule {}
