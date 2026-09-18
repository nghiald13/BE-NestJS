import { BadRequestException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, isValidObjectId, Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Payment } from './schema/payment.schema';
import { PaymentAttemptStatus, PaymentMethod, PaymentStatus, RefundAttemptStatus } from '../../../../../libs/enum/payment.enum';
import { Types } from 'mongoose';
import { PaymentAttempt, PaymentAttemptDocument } from './schema/payment_attempt.schema';
import dayjs, { } from "dayjs";
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ZaloPayService } from './zalopay.service';
import { RefundAttempt } from './schema/refund_attempt.schema';

@Injectable()
export class PaymentService {
  private readonly logger: Logger;

  constructor(
    private readonly zaloPayService: ZaloPayService,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,

    @InjectModel(PaymentAttempt.name)
    private readonly paymentAttemptModel: Model<PaymentAttempt>,

    @InjectModel(RefundAttempt.name)
    private readonly refundAttemptModel: Model<RefundAttempt>,

    @InjectConnection()
    private readonly connection: Connection,

    @InjectQueue('PAYMENT_QUEUE')
    private readonly paymentQueue: Queue,

  ) { }

  async queryStatus(orderId: string) {
    const payment = await this.paymentModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .select('status')
      .lean()

    return payment.status;
  }

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
    if (payment.status === PaymentStatus.PAID) throw new RpcException({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Order has already been paid!'
    });
    if (payment.status === PaymentStatus.FINALIZING) throw new RpcException({
      statusCode: HttpStatus.CONFLICT,
      message: 'Current payment is being finalized! Do not attempt any further!'
    })

    let activeAttempt = await this.paymentAttemptModel.findOne({
      paymentId: payment._id,
      method: data.method,
      status: PaymentAttemptStatus.PROCESSING,
      payUrlExpiresAt: { $gt: new Date() },
    })

    if (!activeAttempt) {
      activeAttempt = await this.createPaymentAttempt({
        orderId: new Types.ObjectId(data.orderId),
        paymentId: payment._id,
        amount: payment.amount,
        method: data.method,
      })
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
      status: PaymentStatus.PENDING,
      expiresAt: dayjs().add(10, 'minutes').toDate(),
    })
    console.log(`Payment ${payment._id} created successfully`)

    // Add scheduled job: payment.finalizing
    await this.paymentQueue.add('payment.finalizing', {
      paymentId: payment._id.toString(),
    }, {
      jobId: `payment.finalizing-${payment._id.toString()}`,
      delay: dayjs(payment.expiresAt).diff(dayjs()),
      removeOnComplete: true,
      removeOnFail: true,
    })

    // Create first payment attempt for this payment
    try {
      await this.createPaymentAttempt({
        orderId: new Types.ObjectId(data.orderId),
        paymentId: payment._id,
        method: data.method,
        amount: data.amount,
      })
      console.log(`PaymentAttempt for Payment ${payment._id} created successfully`)
    } catch (error: any) {
      console.log(`PaymentAttempt for Payment ${payment._id} failed to create, detail: ${error}`)
    }
  }

  private async createPaymentAttempt({ orderId, paymentId, method, amount }: {
    orderId: Types.ObjectId,
    paymentId: Types.ObjectId,
    method: PaymentMethod,
    amount: number,
  }) {
    let payData: { queryCode: string, payUrl: string, payUrlExpiresAt: Date };
    let status = PaymentAttemptStatus.PROCESSING;
    try {
      payData = await this.getPayUrlByPaymentMethod(method, { _id: orderId.toString(), amount });
    } catch (error: any) {
      status = PaymentAttemptStatus.FAILED;
    }
    const { payUrl, payUrlExpiresAt, queryCode } = payData;
    const paymentAttempt = await this.paymentAttemptModel.create({
      paymentId,
      method,
      queryCode,
      amount,
      payUrl: payUrl ?? null,
      payUrlExpiresAt: payUrlExpiresAt ?? null,
      status,
    })
    await this.paymentQueue.add('paymentAttempt.auto-check', {
      paymentAttemptId: paymentAttempt._id,
    }, {
      jobId: `paymentAttempt.auto-check.attempt-${paymentAttempt._id.toString()}`,
      delay: dayjs(paymentAttempt.payUrlExpiresAt).diff(dayjs()),
      removeOnComplete: true,
      removeOnFail: true,
    });
    return paymentAttempt;
  }

  private cod() {
    return null;
  }

  private getPayUrlByPaymentMethod(method: PaymentMethod, order: { _id: string, amount: number }) {
    switch (method) {
      case PaymentMethod.ZALOPAY:
        return this.zaloPayService.getZaloPayUrl(order);
      default:
        return this.cod();
    }
  }

  // Scheduled Job: Payment Finalizing (trigger when payment expiresAt hits)
  async paymentFinalizing(paymentId: string) {
    // Check whether any attempts in processing status
    const processingAttempts: boolean = await this.paymentAttemptModel.countDocuments({
      paymentId: new Types.ObjectId(paymentId),
      status: PaymentAttemptStatus.PROCESSING,
    }) > 0;

    let status = PaymentStatus.CANCELLED;
    // If any attempts processing, change status
    if (processingAttempts) {
      status = PaymentStatus.FINALIZING
    }

    // Else, all attempts are failed (paid case was updated only through zalopay callback), cancel by default
    await this.paymentModel.findOneAndUpdate({ _id: new Types.ObjectId(paymentId) }, {
      $set: { status: status }
    });
  }

  async cancel(orderId: string) {
    const payment = await this.paymentModel.findOne({ orderId: new Types.ObjectId(orderId) });
    if (!payment) return;
    const paymentAttempts = await this.paymentAttemptModel.find({
      paymentId: payment._id,
      status: PaymentAttemptStatus.SUCCESS,
    });
    await this.paymentModel.updateOne({ _id: payment._id }, {
      $set: { status: PaymentStatus.CANCELLED }
    });
    if (paymentAttempts) {
      // For every success Payment Attempt -> Refund
      for (const attempt of paymentAttempts) {
        await this.refund(attempt);
      }
    }
  }

  async refund(paymentAttempt: PaymentAttemptDocument) {
    // Idempotency
    const existing = await this.refundAttemptModel.findOne({
      paymentAttemptId: paymentAttempt._id,
      status: { $in: [RefundAttemptStatus.SUCCESS, RefundAttemptStatus.PROCESSING, RefundAttemptStatus.REQUESTED_REFUND] },
    });
    if (existing) return;

    // Create Refund Attempt with basic info
    const refundAttempt = await this.refundAttemptModel.create({
      paymentAttemptId: paymentAttempt._id,
      amount: paymentAttempt.amount,
      status: RefundAttemptStatus.REQUESTED_REFUND,
    });
    let status = RefundAttemptStatus.PROCESSING;
    let result;
    try {
      // Request Refund Attempt to ZaloPay API, return attempt result
      result = await this.zaloPayService.requestZaloPayRefund({
        paymentAttemptId: paymentAttempt._id.toString(),
        transactionId: paymentAttempt.transactionId,
        amount: paymentAttempt.amount,
      }); // might throw InternalServerException
    } catch (error: any) {
      // Case Server Error -> Schedule Retry
      await this.refundAttemptModel.updateOne({ _id: refundAttempt._id }, {
        $set: { status: RefundAttemptStatus.PROCESSING }
      });
      await this.paymentQueue.add('refundAttempt.auto-check', {
        refundAttemptId: refundAttempt._id.toString(),
      }, {
        jobId: `refundAttempt.auto-check-${refundAttempt._id.toString()}`,
        delay: 30_000,
        removeOnComplete: true,
        removeOnFail: true,
      });
      return;
    }

    const { queryCode, refund_id } = result;
    // Update Refund Attempt regardless result
    await this.refundAttemptModel.updateOne({ _id: refundAttempt._id }, {
      $set: {
        queryCode,
        transactionId: refund_id,
        status,
      }
    });

    // Create BullMQ delayed job to reconcile refund attempt status after 30-60 sec
    await this.paymentQueue.add(`refundAttempt.auto-check`, {
      refundAtemptId: refundAttempt._id.toString(),
    }, {
      jobId: `refundAttempt.auto-check-${refundAttempt._id.toString()}`,
      delay: dayjs(dayjs().add(30, 's')).diff(dayjs()),
      removeOnComplete: true,
      removeOnFail: true,
    })
  }

  async reconcileRefundAttempt(refundAttemptId: string) {
    const refundAttempt = await this.refundAttemptModel.findOne({_id: refundAttemptId});

    // Idempotency
    if (refundAttempt.status === RefundAttemptStatus.SUCCESS) return;

    let refundResult;
    try {
      refundResult = await this.zaloPayService.queryZaloPayRefund(refundAttempt.queryCode); // might throw Exception
    } catch (error: any) {
      this.logger.fatal(`Failed to query refund, trace: ${error.message}`);
    }
    
    const {return_code} = refundResult;
    let status = RefundAttemptStatus.PROCESSING;
    if (return_code === 1) {
      status = RefundAttemptStatus.SUCCESS;
    } else if (return_code === 2) {
      status = RefundAttemptStatus.FAILED;
    } else {
      // Delay job
    }

    await this.refundAttemptModel.findOneAndUpdate({_id: refundAttempt._id}, {
      $set: {
        status,
      }
    });
    this.logger.log(`Reconcile Refund Attempt "${refundAttemptId}" status: ${status}, updated Database`);
  }
}
