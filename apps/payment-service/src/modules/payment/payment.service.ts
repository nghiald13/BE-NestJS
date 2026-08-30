import { BadRequestException, HttpStatus, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import queryString from 'query-string';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, isValidObjectId, Model } from 'mongoose';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { CreateOrderDto } from 'apps/order-service/src/modules/orders/dto/create-order.dto';
import { Payment } from './schema/payment.schema';
import { PaymentMethod } from '../../../../../libs/enum/payment.enum';
import { Types } from 'mongoose';
import { PaymentAttempt } from './schema/payment_attempt.schema';
import dayjs, { } from "dayjs";
import { OutboxDocument, OutboxEvent } from 'apps/outbox/src/schemas/outbox.schema';

@Injectable()
export class PaymentService {
  // Inject HttpService vào trong class
  constructor(
    private readonly httpService: HttpService,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,

    @InjectModel(PaymentAttempt.name)
    private readonly paymentAttemptModel: Model<PaymentAttempt>,

    @Inject('ORDER_SERVICE')
    private readonly orderClient: ClientProxy,

    @InjectConnection()
    private readonly connection: Connection,

    @InjectModel(OutboxEvent.name)
    private readonly outboxModel = Model<OutboxDocument>,

  ) { }

  async pay(data: { orderId: string, method: PaymentMethod }) {
    let payment;
    try {
      if (!isValidObjectId(data.orderId)) throw new BadRequestException('Invalid Order Id Format!')
      payment = await this.paymentModel.findOne({
        orderId: new Types.ObjectId(data.orderId),
      })
      if (!payment) throw new BadRequestException('Invalid Order! Order does not exist!')
    } catch (error: any) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message
      })
    }

    // Idempotency
    if (payment.status === 'PAID') throw new RpcException({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Order has already been paid!'
    });

    let activeAttempt = await this.paymentAttemptModel.findOne({
      paymentId: payment._id,
      method: data.method,
      status: "PENDING",
      payUrlExpiresAt: { $gt: new Date() },
    })

    if (!activeAttempt) {
      let payData: {payUrl: string, payUrlExpiresAt: Date};
      let status = 'PENDING';
      try {
        payData = await this.getPayUrlByPaymentMethod(data.method, { _id: data.orderId, amount: payment.amount });
      } catch (error: any) {
        status = 'FAILED';
        throw new RpcException(error);
      } finally {
        const { payUrl, payUrlExpiresAt } = payData;
        activeAttempt = await this.paymentAttemptModel.create({
          paymentId: payment._id,
          method: data.method,
          amount: payment.amount,
          payUrl,
          payUrlExpiresAt,
          status,
        })
      }
    }

    return activeAttempt.payUrl;
    
  }

  async create(data: {
    orderId: string,
    method: PaymentMethod,
    amount: number,
  }) {

    // Idempotency check
    let payment = await this.paymentModel.findOne({ orderId: new Types.ObjectId(data.orderId) });
    if (payment) return;

    // Create Payment basic info
    payment = await this.paymentModel.create({
      orderId: new Types.ObjectId(data.orderId),
      amount: data.amount,
      remaining: data.amount,
      status: "PENDING"
    })

    // Process to get payData (payUrl and expires)
    let payData: { payUrl: string, payUrlExpiresAt: Date };
    let status = "PROCESSING";
    try {
      payData = await this.getPayUrlByPaymentMethod(data.method, { _id: data.orderId, amount: data.amount });
    } catch (error: any) {
      status = 'FAILED'
    }
    const { payUrl, payUrlExpiresAt } = payData;

    // Create First PaymmentAttempt for Payment
    await this.paymentAttemptModel.create({
      paymentId: payment._id,
      method: data.method,
      amount: data.amount,
      payUrl,
      payUrlExpiresAt,
      status,
    })
  }

  private hmacsha256(data: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(data)
      .digest('hex');
  }

  private cod() {

  }

  private getPayUrlByPaymentMethod(method: PaymentMethod, order: { _id: string, amount: number }) {
    switch (method) {
      case PaymentMethod.MOMO:
        return this.getMoMoPayUrl(order);
      case PaymentMethod.ZALOPAY:
        return this.getZaloPayUrl(order);
    }
  }

  private async getMoMoPayUrl(order: { _id: string, amount: number }) {
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
      orderId: order._id,
      orderInfo: `Thanh toan don ${order._id}`,
      partnerCode: momoPartnerCode,
      redirectUrl: `${process.env.FRONT_END_BASE_URL}${process.env.FRONT_END_CHECKOUT}`,
      requestId: requestId,
      requestType: "captureWallet"
    }

    const signature = this.hmacsha256(queryString.stringify(requestBody, { encode: false }), momoSecretKey)
    const response = await firstValueFrom(
      this.httpService.post(endpoint, {
        ...requestBody,
        signature: signature,
        // optional MoMo props
        // items: dto.items
      },
        { headers: { 'Content-Type': 'application/json; charset=UTF-8' }, }
      )
    );

    const momoResult = response.data;
    if (!momoResult || !momoResult?.payUrl)
      throw new RpcException('Error while fetching MOMO API. Try again later!')

    return {
      payUrl: momoResult.payUrl,
      payUrlExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // expires in 15 minutes
    }
  }

  private async getZaloPayUrl(order: { _id: string, amount: number }) {
    const APP_ID = +process.env.ZP_APP_ID;
    const KEY1 = process.env.ZP_KEY1;
    const endpoint = process.env.ZP_API_CREATEORDER;

    // Preprocessing request body
    const app_time = Date.now();
    const app_trans_id = `${dayjs().format('YYMMDD')}_${order._id}_${dayjs().format('HHmmss')}`
    const embed_data = {
      // redirect_url: `${process.env.FRONT_END_BASE_URL}${process.env.FRONT_END_CHECKOUT}`
    }

    // Initialize request body
    const requestBody = {
      app_id: APP_ID,
      app_user: "Test Payment",
      app_trans_id: app_trans_id,
      app_time: app_time,
      expire_duration_seconds: 300,
      amount: order.amount,
      item: JSON.stringify([]),
      description: `Payment for Order ${app_trans_id}`,
      embed_data: JSON.stringify(embed_data),
      callback_url: `${process.env.NGROK_HOOK}/api/v1/payment/zalo/callback`,
      // bank_code: '',
    }

    // sign mac with sha256
    const hmac_input = `${requestBody.app_id}|${requestBody.app_trans_id}|${requestBody.app_user}|${requestBody.amount}|${requestBody.app_time}|${requestBody.embed_data}|${requestBody.item}`;
    const mac = this.hmacsha256(hmac_input, KEY1);

    // fetch zalopay api with {requestBody, mac}
    const response = await firstValueFrom(
      this.httpService.post(endpoint, {
        ...requestBody,
        mac: mac,
      }, {
        headers: { 'Content-Type': 'application/json' },
      }));

    // errors handling
    const result = response.data;
    if (!result) {
      throw new RpcException('Error while fetching API!')
    }
    if (result.return_code !== 1) {
      throw new RpcException('Error while getting payUrl link!')
    }

    // success
    return {
      payUrl: result.order_url,
      payUrlExpiresAt: dayjs().add(5, 'minute').toDate(),
    };
  }

  async zaloPayCallbackHandler({ data, mac }: { data: string, mac: string }) {
    // Revalidate MAC
    const mac_check = this.hmacsha256(data, process.env.ZP_KEY2);
    if (mac !== mac_check) {
      console.log("Invalid mac!")
      return
    }

    const response = JSON.parse(data);
    // Prepare result to response ZaloPayCallback, default success
    let result = {
      return_code: 1,
      return_message: 'Payment confirmed'
    }

    // Update payment
    const orderId: string = response.app_trans_id.split('_')[1] // remove 'YYMMDD_' prefix and suffix 'HHmmss'


    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      // Find corresponding Payment and update its status
      const payment = await this.paymentModel.findOneAndUpdate({ orderId: new Types.ObjectId(orderId) }, {
        $inc: { remaining: -response.amount },
        $set: { status: 'PAID' },
      }, { session });

      // Idempotency
      if (payment.status === 'PAID') throw new Error(`Payment ${payment._id} has already been PAID`);

      // Find attempt and update attempt
      await this.paymentAttemptModel.findOneAndUpdate({ paymentId: new Types.ObjectId(payment._id) }, {
        $set: {
          transactionId: response.zp_trans_id.toString(),
          payDate: dayjs(response.server_time).toDate(),
          status: 'SUCCESS',
        },
      }, { session });

      // emit event payment.success to consumers
      await this.outboxModel.create([{
        topic: 'payment.success',
        payload: { orderId, },
      }], { session });

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      console.log(`Error while updating Payment! Detail: ${error.message}`)
      result = {
        return_code: 0,
        return_message: 'Try callback'
      }
    }
    await session.endSession();
    return result;
  }
}
