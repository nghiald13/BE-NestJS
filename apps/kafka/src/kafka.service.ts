import { Injectable } from '@nestjs/common';

@Injectable()
export class KafkaService {
  getHello(): string {
    return 'Hello World!';
  }
}
