import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { Types } from "mongoose";
import { PaymentService } from "./payment.service";
import { ZaloPayService } from "./zalopay.service";

@Injectable()
@Processor('PAYMENT_QUEUE')
export class PaymentProcessor extends WorkerHost {
    private readonly logger = new Logger(PaymentProcessor.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly zaloPayService: ZaloPayService,
    ) { super(); }

    process(job: Job, token?: string): Promise<any> {
        switch (job.name) {
            case 'paymentAttempt.auto-check':
                return this.checkPaymentAttemptStatus(job.data);
            case 'payment.finalizing':
                return this.paymentFinalizing(job.data);
            case 'refundAttempt.auto-check':
                return this.refundAttemptReconcile(job.data);
            default:
                this.logger.warn(`Không tìm thấy Handler cho Job: ${job.name}`);
                break;

        }
    }


    // Auto methods
    private checkPaymentAttemptStatus({ paymentAttemptId }: { paymentAttemptId: Types.ObjectId }) {
        return this.zaloPayService.zaloPayQuery(paymentAttemptId.toString());
    }

    private paymentFinalizing({ paymentId }: { paymentId: string }) {
        return this.paymentService.paymentFinalizing(paymentId);
    }

    private refundAttemptReconcile({ queryCode }: { queryCode: string }) {
        return this.paymentService.reconcileRefundAttempt(queryCode);
    }

}