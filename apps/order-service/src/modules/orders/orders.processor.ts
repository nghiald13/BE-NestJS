import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
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
                return this.autoCheck(job.data);
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