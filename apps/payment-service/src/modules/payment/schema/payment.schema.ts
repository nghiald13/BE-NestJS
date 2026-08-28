import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SchemaDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
    @Prop({ required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ default: null })
    method: string;

    @Prop({ default: null })
    transactionId: string;

    @Prop({ required: true })
    amount: number;

    @Prop({ default: 'PENDING' })
    status: string;

    @Prop({ default: null })
    paidAt: Date;

    @Prop({ default: null })
    payUrl: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);