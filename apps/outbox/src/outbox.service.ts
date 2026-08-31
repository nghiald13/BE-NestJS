
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { ClientKafka } from '@nestjs/microservices';
import { OutboxEvent, OutboxDocument } from './schemas/outbox.schema';
import { firstValueFrom, timeout } from 'rxjs';


@Injectable()
export class OutboxWorkerService implements OnModuleInit {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private isProcessing = false;

  constructor(
    @InjectModel(OutboxEvent.name) private outboxModel: Model<OutboxDocument>,
    @Inject('KAFKA_OUTBOX_CLIENT') private readonly kafkaClient: ClientKafka,
  ) { }

  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('Kafka client connected');
    } catch (err) {
      this.logger.error('Kafka connect failed', err);
    }
  }

  @Cron('*/3 * * * * *')
  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.logger.log('Outbox tick running...');

    try {
      const pendingEvents = await this.outboxModel
        .find({ sent: false, retryCount: { $lt: 5 } })
        .sort({ createdAt: 1 })
        .limit(50)
        .exec();
      this.logger.log(`Found ${pendingEvents.length} pending events`);

      for (const event of pendingEvents) {
        try {
          await firstValueFrom(
            this.kafkaClient.emit(event.topic, event.payload).pipe(timeout(10000))
          );

          event.sent = true;
          event.sentAt = new Date();
          event.lastError = undefined;
          await event.save();

          this.logger.log(`Published outbox event ${event._id} → topic ${event.topic}`);
        } catch (error: any) {
          const message = error?.message ?? String(error);
          this.logger.error(`Failed to publish outbox event ${event._id}: ${message}`);

          try {
            event.retryCount += 1;
            event.lastError = message;
            await event.save();
          } catch (saveError: any) {
            this.logger.error(
              `Failed to persist retry state for event ${event._id}: ${saveError?.message}`,
            );
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}