import { NestFactory } from '@nestjs/core';
import { OutboxModule } from './outbox.module';

async function bootstrap() {
  const app = await NestFactory.create(OutboxModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
