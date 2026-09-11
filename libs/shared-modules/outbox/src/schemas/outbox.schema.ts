
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OutboxDocument = OutboxEvent & Document;

@Schema({ timestamps: true })
export class OutboxEvent {
    @Prop({ required: true })
    topic: string;

    @Prop({ type: Object, required: true })
    payload: Record<string, any>;

    @Prop({ default: false })
    sent: boolean;

    @Prop({ default: 0 })
    retryCount: number;

    @Prop()
    lastError?: string;

    @Prop()
    sentAt?: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ sent: 1, createdAt: 1 });