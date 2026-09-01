import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bullmq";
import { Model, Types } from "mongoose";
import { Payment } from "./schema/payment.schema";
import { PaymentAttempt } from "./schema/payment_attempt.schema";
import { hmacsha256 } from "libs/hash/hash.algorithm";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";

@Injectable()
@Processor('PAYMENT_PROCESSOR')
export class PaymentProcessor extends WorkerHost {
    private readonly logger = new Logger(PaymentProcessor.name);

    constructor(
        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        @InjectModel(PaymentAttempt.name)
        private readonly paymentAttemptModel: Model<PaymentAttempt>,

        private readonly httpService: HttpService,

    ) { super(); }

    process(job: Job, token?: string): Promise<any> {
        switch (job.name) {
            case 'payment.auto-check':
                return this.checkPaymentAttemptStatus(job.data);
            default:
                this.logger.warn(`Không tìm thấy Handler cho Job: ${job.name}`);
                break;

        }
    }


    // Auto methods
    private async checkPaymentAttemptStatus({ paymentAttemptId }: { paymentAttemptId: Types.ObjectId }) {
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
        const result = response?.data;
        if (result) {

        }
    }

}