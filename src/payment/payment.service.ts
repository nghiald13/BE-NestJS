import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
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

    const requestBody = {
      accessKey: momoAccessKey,
      amount: +createPaymentDto.amount,
      extraData: '',
      ipnUrl: 'https://your-api.com/v1/payment/momo-webhook', // Link NestJS nhận kết quả ngầm từ MoMo
      orderId: `ORD_${Date.now()}`,
      orderInfo: 'thanhtoandonhang',
      partnerCode: momoPartnerCode,
      redirectUrl: 'http://localhost:3000/checkout', // Link quay lại Next.js sau khi thanh toán xong
      requestId: `REQ_${Date.now()}`,
      requestType: 'captureWallet',
      // signature: '', Được tính từ SecretKey
    };


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
