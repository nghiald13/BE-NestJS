import { HttpStatus, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import queryString from 'query-string';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { CreateOrderDto } from 'apps/order-service/src/modules/orders/dto/create-order.dto';
import { Payment } from './schema/payment.schema';
import { PaymentMethod } from '../../../../../libs/enum/payment.enum';
import { Types } from 'mongoose';

@Injectable()
export class PaymentService {
  // Inject HttpService vào trong class
  constructor(
    private readonly httpService: HttpService,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,

    // @InjectConnection()
    // private readonly connection: Connection,

  ) { }

  create(data: {
    orderId: string,
    orderCode: string,
    method: PaymentMethod,
    amount: number,
  }) {
    switch (data.method) {
      case PaymentMethod.MOMO:
        return this.momo({_id: data.orderId, orderCode: data.orderCode, amount: data.amount});
      case PaymentMethod.COD:
        return this.cod();
    }
  }

  private generateMoMoSignature(data: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey) // Khởi tạo thuật toán sha256 với secretKey
      .update(data)                    // Đưa chuỗi dữ liệu vào để băm
      .digest('hex');                  // Xuất kết quả ra định dạng chuỗi Hex (Hexadecimal)
  }

  private cod() {

  }

  private async momo(order: { _id: string, orderCode: string, amount: number }) {
    const endpoint = process.env.MOMO_TEST_ENV_URL
    const momoPartnerCode = process.env.MOMO_PARTNER_CODE
    const momoAccessKey = process.env.MOMO_ACCESS_KEY
    const momoSecretKey = process.env.MOMO_SECRET_KEY
    const requestId = `REQ_${Date.now()}`

    const requestBody = {
      accessKey: momoAccessKey,
      amount: order.amount,
      extraData: "",
      ipnUrl: `${process.env.BACK_END_BASE_URL}/api/v1/payment/checkout`,
      orderId: order.orderCode,
      orderInfo: `Thanh toan don ${order.orderCode}`,
      partnerCode: momoPartnerCode,
      redirectUrl: `${process.env.FRONT_END_BASE_URL}${process.env.FRONT_END_CHECKOUT}`,
      requestId: requestId,
      requestType: "captureWallet"
    }

    const signature = this.generateMoMoSignature(queryString.stringify(requestBody, { encode: false }), momoSecretKey)
    const response = await firstValueFrom(
      this.httpService.post(endpoint, {
        ...requestBody,
        signature: signature,
        // optional MoMo props
        // items: dto.items
      },
        { headers: { 'Content-Type': 'application/json' }, }
      )
    );

    const momoResult = response.data;
    if (momoResult && momoResult.payUrl) {
      try {
        // Create Payment
        const payment: Payment = await this.paymentModel.create({
          method: PaymentMethod.MOMO,
          amount: order.amount,
          orderId: new Types.ObjectId(order._id),
          status: 'PENDING',
          payUrl: momoResult.payUrl,
        });
        return momoResult.payUrl;
      } catch (error: any) {
        console.log(`Error while creating payUrl and payment: `, error.message)
        throw new RpcException(error.message);
      }
    } else throw new RpcException('Error while fetching MOMO API!')
  }

  // async verifyPayment(momoPaymentDto: MomoPaymentDto) {

  //   const momoPartnerCode = process.env.MOMO_PARTNER_CODE
  //   const momoAccessKey = process.env.MOMO_ACCESS_KEY
  //   const momoSecretKey = process.env.MOMO_SECRET_KEY

  //   const rawData = {
  //     accessKey: momoAccessKey,
  //     amount: momoPaymentDto.amount,
  //     extraData: momoPaymentDto.extraData,
  //     message: momoPaymentDto.message,
  //     orderId: momoPaymentDto.orderId,
  //     orderInfo: momoPaymentDto.orderInfo,
  //     orderType: momoPaymentDto.orderType,
  //     partnerCode: momoPartnerCode,
  //     payType: momoPaymentDto.payType,
  //     requestId: momoPaymentDto.requestId,
  //     responseTime: momoPaymentDto.responseTime,
  //     resultCode: momoPaymentDto.resultCode,
  //     transId: momoPaymentDto.transId,
  //   }

  //   const signature = this.generateMoMoSignature(
  //     queryString.stringify(rawData, { encode: false }),
  //     momoSecretKey
  //   )
  //   const signatureFromMomo = momoPaymentDto.signature

  //   if (!(signatureFromMomo === signature)) throw new ForbiddenException("Signature doesn't match")

  //   const resultCode = Number(momoPaymentDto.resultCode);
  //   if (resultCode === 0) {
  //     await this.orderModel.findOneAndUpdate(
  //       { orderCode: momoPaymentDto.orderId },
  //       {
  //         status: 'PAID',
  //         momoTransId: momoPaymentDto.transId.toString(),
  //         momoPayType: momoPaymentDto.payType,
  //         paymentAt: new Date(momoPaymentDto.responseTime)
  //       }
  //     );
  //     console.log(`Đơn hàng ${momoPaymentDto.orderId} giao dịch thành công. Đã cập nhật trạng thái PAID.`);
  //   } else {

  //     // Refund product stock (MOCK successful as my UAT MOMO hasn't verified)
  //     const order = await this.orderModel.findOne({ orderCode: momoPaymentDto.orderId });
  //     if (order) {
  //       const orderDetails = await this.orderDetailsModel.find({ orderId: order._id });
  //       if (orderDetails) {
  //         const bulkOps = orderDetails.map(item => ({
  //           updateOne: {
  //             filter: { _id: item.productId },
  //             update: { $inc: { stock: item.quantity } }
  //           }
  //         }));
  //         await this.productModel.bulkWrite(bulkOps);
  //         console.log(`Đã hoàn trả kho thành công cho các sản phẩm của đơn hàng ${momoPaymentDto.orderId}`);
  //       }
  //     }

  //     // Update order status
  //     await this.orderModel.findOneAndUpdate(
  //       { orderCode: momoPaymentDto.orderId },
  //       {
  //         status: 'FAILED',
  //         momoTransId: momoPaymentDto.transId.toString(),
  //         momoPayType: momoPaymentDto.payType,
  //         paymentAt: new Date(momoPaymentDto.responseTime)
  //       }
  //     );
  //     console.log(`Đơn hàng ${momoPaymentDto.orderId} bị lỗi/hủy với mã: ${resultCode}. Đã cập nhật FAILED.`);
  //   }

  //   return true;
  // }
}
