import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Type } from "class-transformer";
import { RefundAttemptStatus } from "libs/enum/payment.enum";
import { HydratedDocument, Types } from "mongoose";

export type RefundDocument = HydratedDocument<RefundAttempt>;

@Schema({ timestamps: true })
export class RefundAttempt {

    @Prop({required: true, type: Types.ObjectId, ref: 'PaymentAttempt'})
    @Type(() => Types.ObjectId)
    paymentAttemptId: Types.ObjectId;

    @Prop()
    queryCode: string;

    @Prop({required: true})
    amount: number;

    @Prop()
    transactionId: string;

    @Prop()
    refundDate: Date;

    @Prop({required: true, enum: RefundAttemptStatus})
    status: string;
}

export const RefundAttemptSchema = SchemaFactory.createForClass(RefundAttempt);