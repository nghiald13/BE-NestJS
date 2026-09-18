import { HttpService } from "@nestjs/axios";
import { InjectQueue } from "@nestjs/bullmq";
import { HttpStatus, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Queue } from "bullmq";
import dayjs from "dayjs";
import { hmacsha256 } from "libs/hash/hash.algorithm";
import { OutboxEvent, OutboxDocument } from "libs/shared-modules/outbox/src/schemas/outbox.schema";
import { Model, Connection } from "mongoose";
import { firstValueFrom } from "rxjs";
import { Payment } from "./schema/payment.schema";
import { PaymentAttempt } from "./schema/payment_attempt.schema";
import { RefundAttempt } from "./schema/refund_attempt.schema";
import { PaymentAttemptStatus, PaymentStatus, RefundAttemptStatus } from "libs/enum/payment.enum";
import { PaymentService } from "./payment.service";

@Injectable()
export class ZaloPayService {
    private readonly logger: Logger;

    constructor(
        private readonly paymentService: PaymentService,
        private readonly httpService: HttpService,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        @InjectModel(PaymentAttempt.name)
        private readonly paymentAttemptModel: Model<PaymentAttempt>,

        @InjectModel(RefundAttempt.name)
        private readonly refundAttemptModel: Model<RefundAttempt>,

        @InjectConnection()
        private readonly connection: Connection,

        @InjectModel(OutboxEvent.name)
        private readonly outboxModel = Model<OutboxDocument>,

        @InjectQueue('PAYMENT_QUEUE')
        private readonly paymentQueue: Queue,
    ) { }

    async getZaloPayUrl(order: { _id: string, amount: number }) {
        const APP_ID = +process.env.ZP_APP_ID;
        const KEY1 = process.env.ZP_KEY1;
        const endpoint = process.env.ZP_API_CREATEORDER;

        // Preprocessing request body
        const app_time = Date.now();
        const app_trans_id = `${dayjs().format('YYMMDD')}_${order._id}_${dayjs().format('HHmmss')}`
        const embed_data = {
            // redirect_url: `${process.env.FRONT_END_BASE_URL}${process.env.FRONT_END_CHECKOUT}`
            redirecturl: `http://localhost:3000/checkout`
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
        const mac = hmacsha256(hmac_input, KEY1);

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
            queryCode: app_trans_id,
            payUrl: result.order_url,
            payUrlExpiresAt: dayjs().add(5, 'minute').toDate(),
        };
    }

    // ZaloPay Callback Handler ONLY FOR SUCCESS
    async zaloPayCallbackHandler({ data, mac }: { data: string, mac: string }) {
        // Revalidate MAC
        const mac_check = hmacsha256(data, process.env.ZP_KEY2);
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
        const queryCode: string = response.app_trans_id
        const session = await this.connection.startSession();
        await session.startTransaction();

        try {
            // Find attempt and update attempt
            const paymentAttempt = await this.paymentAttemptModel.findOneAndUpdate({ queryCode }, {
                $set: {
                    transactionId: response.zp_trans_id.toString(),
                    payDate: dayjs(response.server_time).toDate(),
                    status: 'SUCCESS',
                },
            }, { session });

            // Find corresponding Payment
            const payment = await this.paymentModel
                .findOne({ _id: paymentAttempt.paymentId })
                .select("orderId status");
            // Update Payment based on Current Payment status
            if (payment.status === PaymentStatus.CANCELLED) {
                await this.paymentService.refund(paymentAttempt);
            } else {
                await this.paymentModel.findOneAndUpdate({ _id: payment._id }, {
                    $set: {
                        remaining: { $inc: -paymentAttempt.amount },
                        status: PaymentStatus.PAID,
                    }
                }, { session })
                // emit event payment.success to consumers
                await this.outboxModel.create([{
                    topic: 'payment.success',
                    payload: { orderId: payment.orderId.toString() },
                }], { session });
            }
            // Delete delayed job autocheck paymentAttemptId
            await this.paymentQueue.remove(`paymentAttempt.auto-check.attempt-${paymentAttempt._id.toString()}`);

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

    // Query Order status as Scheduled job
    async zaloPayQuery(paymentAttemptId: string) {
        const paymentAttempt = await this.paymentAttemptModel.findOne({ _id: paymentAttemptId });
        if (!paymentAttempt) return;
        const payment = await this.paymentModel.findOne({ _id: paymentAttempt.paymentId });
        if (!payment) return;

        const key1 = process.env.ZP_KEY1;
        const endpoint = process.env.ZP_API_QUERYORDER;
        const app_id = process.env.ZP_APP_ID;
        const app_trans_id = paymentAttempt.queryCode;
        const hmac_input = `${app_id}|${app_trans_id}|${key1}`
        const mac = hmacsha256(hmac_input, key1);

        // query real status from ZaloPay
        const response = await firstValueFrom(
            this.httpService.post(endpoint, {
                app_id,
                app_trans_id,
                mac,
            }, {
                headers: { 'Content-Type': 'application/json' }
            })
        )

        const result = response.data;
        if (!result) {
            console.log(`Auto check PaymentAttempt ${paymentAttempt._id.toString()} failed`);
            return;
        }

        const session = await this.connection.startSession();
        await session.startTransaction();

        const { return_code, return_message, sub_return_code, sub_return_message, zp_trans_id, server_time, amount } = result;
        try {
            const updated = await this.paymentAttemptModel.updateOne({ _id: paymentAttempt._id }, {
                $set: {
                    transactionId: zp_trans_id,
                    payDate: server_time,
                    status:
                        return_code === 1 ? PaymentAttemptStatus.SUCCESS :
                            return_code === 3 ? PaymentAttemptStatus.PROCESSING :
                                PaymentAttemptStatus.FAILED,
                }
            }, { session });
            if (!updated) throw new Error(`Error while updating PaymentAttempt ${paymentAttempt._id}!`);
            if (return_code === 1) {
                await this.paymentModel.updateOne({ _id: paymentAttempt.paymentId }, {
                    $inc: { amount: -amount },
                    $set: { status: PaymentStatus.PAID },
                }, { session })
            } else if (return_code === 2 && payment.status === PaymentStatus.FINALIZING) {
                await this.paymentModel.updateOne({ _id: paymentAttempt.paymentId }, {
                    $set: { status: PaymentStatus.CANCELLED }
                }, { session })
            }
            await session.commitTransaction();
        } catch (error: any) {
            await session.abortTransaction();
            console.log(error);
        } finally {
            await session.endSession();
        }
    }

    async requestZaloPayRefund(
        { paymentAttemptId, transactionId, amount }: {
            paymentAttemptId: string,
            transactionId: string,
            amount: number,
        }) {
        const app_id = +process.env.ZP_APP_ID;
        const KEY1 = process.env.ZP_KEY1;
        const endpoint = process.env.ZP_API_CREATEREFUND;

        const m_refund_id = `${dayjs().format('YYMMDD').toString()}_${app_id}_${paymentAttemptId}_${dayjs().format("HHmmss")}`;
        const zp_trans_id = transactionId;
        const timestamp = Date.now();
        const description = `Hoan tien giao dich ${transactionId}`;
        const mac = hmacsha256(`${app_id}|${zp_trans_id}|${amount}|${description}|${timestamp}`, KEY1);
        const requestBody = { m_refund_id, app_id, zp_trans_id, amount, timestamp, mac, description, };

        const response = await firstValueFrom(
            this.httpService.post(endpoint, requestBody, { headers: { "Content-Type": "application/json" } })
        );

        const result = response.data;
        if (!result) {
            this.logger.fatal(`Refund Error: ${response}`)
            throw new InternalServerErrorException("Error while refunding! Please try again later!");
        }

        return {
            queryCode: m_refund_id,
            ...result,
        };
    }

    async queryZaloPayRefund(queryCode: string) {
        const endpoint = process.env.ZP_API_QUERYREFUND;
        const app_id = process.env.ZP_APP_ID;
        const key1 = process.env.ZP_KEY1;
        const m_refund_id = queryCode;
        const timestamp = Date.now()
        const mac = hmacsha256(`${app_id}|${m_refund_id}|${timestamp}`, key1);
        const requestBody = { app_id, m_refund_id, timestamp, mac };
        const response = await firstValueFrom(
            this.httpService.post(endpoint, requestBody, { headers: { "Content-Type": "application/json" } })
        );

        const result = response.data
        if (!result) throw new InternalServerErrorException("Failed to get response from ZaloPay! Try again!");

        return result;
    }
}