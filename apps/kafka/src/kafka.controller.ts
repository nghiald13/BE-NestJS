import { Controller, Get } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Controller()
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) {}

  @Get()
  getHello(): string {
    return this.kafkaService.getHello();
  }
}
