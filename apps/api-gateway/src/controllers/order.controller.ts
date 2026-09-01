import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Headers, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from 'apps/order-service/src/modules/orders/dto/create-order.dto';
import { Microservice } from 'libs/enum/microservice.enum';
import { firstValueFrom } from 'rxjs';

@Controller('order')
export class OrderGatewayController {
    constructor(
        @Inject(Microservice.ORDER_SERVICE)
        private readonly orderClient: ClientProxy
    ) { }

    // ======================== STATIC ROUTES ========================
    @Post('findByUserId')
    findByUserId(@Body() createOrderDto: CreateOrderDto) {
        return this.orderClient.send('order.findByUserId', createOrderDto.userId);
    }

    @Post('create')
    create(@Headers('X-Idempotency-Key') idempotencyKey: string, @Body() dto: CreateOrderDto) {
        if (!idempotencyKey) throw new BadRequestException('X-Idempotency-Key header is required!')
        return firstValueFrom(this.orderClient.send('order.create', {
            idempotencyKey,
            dto,
        }));
    }

    // ======================== DYNAMIC ROUTES ========================
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.orderClient.send('order.findOne', id);
    }
}
