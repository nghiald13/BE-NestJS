import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MomoPaymentDto, UpdatePaymentDto } from './dto/update-payment.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import queryString from 'query-string';

@Injectable()
export class PaymentService {
  // Inject HttpService vào trong class
  constructor(private readonly httpService: HttpService) { }

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
      amount: +createPaymentDto.amount,
      extraData: "",
      ipnUrl: `${process.env.NGROK_HOOK}/api/v1/payment/checkout`,
      orderId: orderId,
      orderInfo: "thanhtoandonhang",
      partnerCode: momoPartnerCode,
      redirectUrl: `${process.env.FRONT_END_BASE_URL}${process.env.FRONT_END_CHECKOUT}`, // Link quay lại Next.js sau khi thanh toán xong
      requestId: requestId,
      requestType: "captureWallet"
    }


    const signature = this.generateMoMoSignature(queryString.stringify(requestBody, { encode: false }), momoSecretKey)

    try {
      /**
       * 💡 THỰC HIỆN FETCH:
       * - this.httpService.post trả về một Observable.
       * - Ta bọc nó trong `firstValueFrom(...)` để biến thành một Promise giúp xài được async/await.
       * - Axios trả về cục response, data từ server MoMo sẽ nằm trong thuộc tính `.data`.
       */
      const response = await firstValueFrom(
        this.httpService.post(endpoint, {
          ...requestBody,
          signature: signature
        },
          { headers: { 'Content-Type': 'application/json' }, }
        )
      );

      const momoResult = response.data;

      if (momoResult && momoResult.payUrl) {
        // Trả link thanh toán về cho Controller để phản hồi lại cho Next.js
        return momoResult.payUrl;
      }

      throw new InternalServerErrorException('Không lấy được payUrl từ MoMo');
    } catch (error: any) {
      console.error('Lỗi khi gọi API MoMo:', error?.response?.data || error.message);
      throw new InternalServerErrorException('Lỗi kết nối cổng thanh toán');
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
      // Code cập nhật DB thành công tại đây (e.g., Đơn hàng Đã Thanh Toán)
      console.log(`Đơn hàng ${momoPaymentDto.orderId} giao dịch thành công.`);
    } else {
      // Giao dịch thất bại hoặc người dùng hủy quét mã
      console.log(`Đơn hàng ${momoPaymentDto.orderId} bị lỗi/hủy với mã: ${resultCode}`);
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
