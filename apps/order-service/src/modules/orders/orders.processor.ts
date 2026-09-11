import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { DelayedError, Job } from "bullmq";
import { OrdersService } from "./orders.service";

@Injectable()
@Processor('ORDER_QUEUE')
export class OrderProcessor extends WorkerHost {
    private readonly logger = new Logger(OrderProcessor.name);

    constructor(
        private readonly ordersService: OrdersService,
    ) { super(); }

    process(job: Job, token?: string): Promise<any> {
        switch (job.name) {
            case 'order.auto-check':
                try {
                    return this.autoCheck(job.data);
                } catch (error: any) {
                    if (error instanceof ConflictException) {
                        this.logger.log(error.message);
                        job.moveToDelayed(Date.now() + 3 * 60 * 1000);
                        throw new DelayedError()
                    } else throw error;
                }

            default:
                this.logger.warn(`Không tìm thấy Handler cho Job: ${job.name}`);
                break;

        }
    }

    // Auto Methods
    private autoCheck({ orderId }: { orderId: string }) {
        return this.ordersService.autoCheck(orderId);
    }
}