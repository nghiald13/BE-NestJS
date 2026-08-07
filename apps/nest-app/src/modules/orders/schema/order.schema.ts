import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId: Types.ObjectId; // ID người mua (để trống nếu cho phép mua không cần đăng nhập)

    @Prop({ required: true, unique: true })
    orderCode: string; // Mã đơn hàng (Gửi sang MoMo làm orderId, ví dụ: ORD_17189212)

    // Thông tin người nhận hàng

    @Prop({ required: true })
    customerEmail: string;

    // Tiền bạc
    @Prop({ required: true, min: 0 })
    totalAmount: number; // Tổng số tiền phải trả (Gửi sang MoMo đối chiếu)

    // Trạng thái đơn hàng và phương thức
    @Prop({ type: String, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'], default: 'PENDING' })
    status: string;

    @Prop({ type: String, enum: ['COD', 'MOMO', 'VNPAY'], default: 'MOMO' })
    paymentMethod: string;

    // 💡 CÁC TRƯỜNG DÀNH RIÊNG ĐỂ LƯU VẾT GIAO DỊCH MOMO (Rất quan trọng)
    @Prop({ unique: true, sparse: true })
    momoTransId: string; // Mã giao dịch do MoMo cấp (transId) khi thanh toán thành công

    @Prop()
    momoPayType: string; // Loại ví khách dùng (ví dụ: qr, credit...)

    @Prop()
    paymentAt: Date; // Thời điểm MoMo xác nhận thanh toán thành công (responseTime)
}

export const OrderSchema = SchemaFactory.createForClass(Order);