import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
    @Prop({ required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ required: true })
    amount: number;

    @Prop({ default: 0 })
    remaining: number;

    @Prop({ default: 'PENDING' })
    status: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);