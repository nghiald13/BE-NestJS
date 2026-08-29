// order-service/src/outbox/outbox-worker.service.ts
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientKafka } from '@nestjs/microservices';
import { OutboxEvent, OutboxDocument } from './schemas/outbox.schema';


@Injectable()
export class OutboxWorkerService implements OnModuleInit {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private isProcessing = false;

  constructor(
    @InjectModel(OutboxEvent.name) private outboxModel: Model<OutboxDocument>,
    @Inject('KAFKA_OUTBOX_CLIENT') private readonly kafkaClient: ClientKafka,
  ) { }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  @Cron('*/3 * * * * *')
  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingEvents = await this.outboxModel
        .find({ sent: false, retryCount: { $lt: 5 } })
        .sort({ createdAt: 1 })
        .limit(50)
        .exec();

      for (const event of pendingEvents) {
        try {
          this.kafkaClient.emit(event.topic, event.payload);

          event.sent = true;
          event.sentAt = new Date();
          await event.save();

          this.logger.log(`Published outbox event ${event._id} → topic ${event.topic}`);
        } catch (error: any) {
          event.retryCount += 1;
          event.lastError = error.message;
          await event.save();

          this.logger.error(`Failed to publish outbox event ${event._id}: ${error.message}`);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}