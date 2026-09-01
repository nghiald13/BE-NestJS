import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

class CustomerInfo {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    email: string;

    @Prop()
    address: string;

    @Prop()
    phone: string;
}

class Pricing {
    @Prop()
    subtotal: number;

    @Prop()
    discount: number;

    @Prop()
    tax: number;

    @Prop()
    shipping: number;

    @Prop()
    total: number;
}

class OrderItem {
    @Prop({ required: true, ref: 'Product' })
    productId: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    quantity: number;
}

@Schema({ timestamps: true })
export class Order {

    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId: Types.ObjectId;

    // Customer's Info
    @Prop({ required: true })
    customerInfo: CustomerInfo;

    // Order Detail
    @Prop({ type: [OrderItem] })
    items: OrderItem[];

    // Pricing
    @Prop({ required: true })
    pricing: Pricing;

    // Status
    @Prop({ type: String, enum: ['PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED'], default: 'PENDING' })
    status: string;

    // Expire At
    @Prop()
    expiresAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);