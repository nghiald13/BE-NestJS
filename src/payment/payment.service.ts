import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MomoPaymentDto, UpdatePaymentDto } from './dto/update-payment.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import queryString from 'query-string';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Order } from '../modules/orders/schema/order.schema';
import { Connection, Model } from 'mongoose';
import { OrderDetails } from '../modules/orders/schema/order_detail.schema';
import { Product } from '../modules/products/schemas/product.schema';

@Injectable()
export class PaymentService {
  // Inject HttpService vào trong class
  constructor(
    private readonly httpService: HttpService,

    @InjectModel(Order.name)
    private orderModel: Model<Order>,

    @InjectModel(OrderDetails.name)
    private orderDetailsModel: Model<OrderDetails>,

    @InjectModel(Product.name)
    private productModel: Model<Product>,

    @InjectConnection()
    private readonly connection: Connection,

  ) { }

  generateMoMoSignature(data: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey) // Khởi tạo thuật toán sha256 với secretKey
      .update(data)                    // Đưa chuỗi dữ liệu vào để băm
      .digest('hex');                  // Xuất kết quả ra định dạng chuỗi Hex (Hexadecimal)
  }

  async create(createPaymentDto: CreatePaymentDto) {

    const endpoint = process.env.MOMO_TEST_ENV_URL
    const momoPartnerCode = process.env.MOMO_PARTNER_CODE
    const momoAccessKey = process.env.MOMO_ACCESS_KEY
    const momoSecretKey = process.env.MOMO_SECRET_KEY

    const orderId = `ORD_${Date.now()}`
    const requestId = `REQ_${Date.now()}`

    const requestBody = {
      accessKey: momoAccessKey,
      amount: +createPaymentDto.billing.totalPrice,
      extraData: "",
      ipnUrl: `${process.env.NGROK_HOOK}/api/v1/payment/checkout`,
      orderId: orderId,
      orderInfo: `Thanh toan don ${orderId}`,
      partnerCode: momoPartnerCode,
      redirectUrl: `${process.env.FRONT_END_BASE_URL}${process.env.FRONT_END_CHECKOUT}`,
      requestId: requestId,
      requestType: "captureWallet"
    }


    const signature = this.generateMoMoSignature(queryString.stringify(requestBody, { encode: false }), momoSecretKey)


    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      // Giữ kho hàng
      for (const item of createPaymentDto.items) {
        const product = await this.productModel.findOne({ _id: item._id }).session(session);
        if (!product || product.in_stock < item.quantity) {
          // 🚨 Nếu có bất kỳ sản phẩm nào không đủ hàng, ném lỗi để ROLLBACK ngay lập tức
          throw new BadRequestException(`Sản phẩm ${item.name} đã hết hàng hoặc không đủ số lượng!`);
        }
        // Trừ kho tạm thời
        product.in_stock -= item.quantity;
        await product.save({ session });
      }

      const order = new this.orderModel({
        userId: createPaymentDto.userInfo._id,
        orderCode: orderId,
        customerEmail: createPaymentDto.userInfo.email,
        totalAmount: createPaymentDto.billing.totalPrice,
      })
      await order.save({ session })

      const orderDetails = createPaymentDto.items.map(item => ({
        orderId: order._id,
        productId: item._id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity
      }))
      await this.orderDetailsModel.insertMany(orderDetails, { session })

      /**
       * 💡 THỰC HIỆN FETCH:
       * - this.httpService.post trả về một Observable.
       * - Ta bọc nó trong `firstValueFrom(...)` để biến thành một Promise giúp xài được async/await.
       * - Axios trả về cục response, data từ server MoMo sẽ nằm trong thuộc tính `.data`.
       */
      const response = await firstValueFrom(
        this.httpService.post(endpoint, {
          ...requestBody,
          signature: signature,
          // optional MoMo props
          items: createPaymentDto.items
        },
          { headers: { 'Content-Type': 'application/json' }, }
        )
      );

      const momoResult = response.data;
      if (momoResult && momoResult.payUrl) {
        // Trả link thanh toán về cho Controller để phản hồi lại cho Next.js
        await session.commitTransaction()
        return momoResult.payUrl;
      }
      throw new InternalServerErrorException('Không lấy được payUrl từ MoMo');

    } catch (error: any) {
      await session.abortTransaction()
      console.error('Lỗi khi gọi API MoMo:', error?.response?.data || error.message);
      throw new InternalServerErrorException('Lỗi kết nối cổng thanh toán');

    } finally {
      await session.endSession()
    }
  }

  async verifyPayment(momoPaymentDto: MomoPaymentDto) {

    const momoPartnerCode = process.env.MOMO_PARTNER_CODE
    const momoAccessKey = process.env.MOMO_ACCESS_KEY
    const momoSecretKey = process.env.MOMO_SECRET_KEY

    const rawData = {
      accessKey: momoAccessKey,
      amount: momoPaymentDto.amount,
      extraData: momoPaymentDto.extraData,
      message: momoPaymentDto.message,
      orderId: momoPaymentDto.orderId,
      orderInfo: momoPaymentDto.orderInfo,
      orderType: momoPaymentDto.orderType,
      partnerCode: momoPartnerCode,
      payType: momoPaymentDto.payType,
      requestId: momoPaymentDto.requestId,
      responseTime: momoPaymentDto.responseTime,
      resultCode: momoPaymentDto.resultCode,
      transId: momoPaymentDto.transId,
    }

    const signature = this.generateMoMoSignature(
      queryString.stringify(rawData, { encode: false }),
      momoSecretKey
    )
    const signatureFromMomo = momoPaymentDto.signature

    if (!(signatureFromMomo === signature)) throw new ForbiddenException("Signature doesn't match")

    const resultCode = Number(momoPaymentDto.resultCode);
    if (resultCode === 0) {
      await this.orderModel.findOneAndUpdate(
        { orderCode: momoPaymentDto.orderId },
        {
          status: 'PAID',
          momoTransId: momoPaymentDto.transId.toString(),
          momoPayType: momoPaymentDto.payType,
          paymentAt: new Date(momoPaymentDto.responseTime)
        }
      );
      console.log(`Đơn hàng ${momoPaymentDto.orderId} giao dịch thành công. Đã cập nhật trạng thái PAID.`);
    } else {

      // Refund product stock (MOCK successful as my UAT MOMO hasn't verified)
      const order = await this.orderModel.findOne({ orderCode: momoPaymentDto.orderId });
      if (order) {
        const orderDetails = await this.orderDetailsModel.find({ orderId: order._id });
        if (orderDetails) {
          const bulkOps = orderDetails.map(item => ({
            updateOne: {
              filter: { _id: item.productId },
              update: { $inc: { stock: item.quantity } }
            }
          }));
          await this.productModel.bulkWrite(bulkOps);
          console.log(`Đã hoàn trả kho thành công cho các sản phẩm của đơn hàng ${momoPaymentDto.orderId}`);
        }
      }

      // Update order status
      await this.orderModel.findOneAndUpdate(
        { orderCode: momoPaymentDto.orderId },
        { status: 'FAILED' }
      );
      console.log(`Đơn hàng ${momoPaymentDto.orderId} bị lỗi/hủy với mã: ${resultCode}. Đã cập nhật FAILED.`);
    }

    return true;
  }

  findAll() {
    return `This action returns all payment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
