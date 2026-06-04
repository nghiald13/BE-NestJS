import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDetailsDocument = HydratedDocument<OrderDetails>;

@Schema({ timestamps: true })
export class OrderDetails {
    @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
    orderId: Types.ObjectId; // Khóa ngoại liên kết sang bảng Order

    @Prop({ required: true })
    productId: string; // ID của sản phẩm trong kho của bạn

    @Prop({ required: true })
    productName: string; // Lưu lại tên sản phẩm đề phòng tương lai bạn đổi tên

    @Prop({ required: true, min: 0 })
    price: number; // Giá của 1 sản phẩm tại thời điểm mua

    @Prop({ required: true, min: 1 })
    quantity: number; // Số lượng mua
}

export const OrderDetailsSchema = SchemaFactory.createForClass(OrderDetails);