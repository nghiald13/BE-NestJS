import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { PaymentMethod } from "libs/enum/payment.enum";

export type PaymentAttemptDocument = HydratedDocument<PaymentAttempt>;

@Schema({timestamps: true})
export class PaymentAttempt {
    
    @Prop()
    paymentId: Types.ObjectId;

    @Prop({enum: PaymentMethod})
    method: string;

    @Prop()
    queryCode: string;

    @Prop({ default: null })
    transactionId: string;

    @Prop({default: null})
    payUrl: string;

    @Prop({default: null})
    payUrlExpiresAt: Date;

    @Prop({default: null})
    payDate: Date;

    @Prop()
    amount: number;

    @Prop()
    status: string;
}

export const PaymentAttemptSchema = SchemaFactory.createForClass(PaymentAttempt);