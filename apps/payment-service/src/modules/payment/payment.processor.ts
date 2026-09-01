import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { Types } from "mongoose";
import { PaymentService } from "./payment.service";

@Injectable()
@Processor('PAYMENT_QUEUE')
export class PaymentProcessor extends WorkerHost {
    private readonly logger = new Logger(PaymentProcessor.name);

    constructor(
        private readonly paymentService: PaymentService,
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
        return this.paymentService.zaloPayQuery(paymentAttemptId.toString());
    }

}