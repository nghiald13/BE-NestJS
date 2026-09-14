import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Headers, BadRequestException, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Microservice } from 'libs/enum/microservice.enum';
import { CreateOrderDto } from 'libs/shared-modules/dto/order.dto';
import { firstValueFrom } from 'rxjs';
import { CurrentUser } from '../decorators/decor';

@Controller('order')
export class OrderGatewayController {
    constructor(
        @Inject(Microservice.ORDER_SERVICE)
        private readonly orderClient: ClientProxy
    ) { }

    // ======================== STATIC ROUTES ========================
    @Get()
    findByUserId(@CurrentUser('sub') userId: string) {
        return this.orderClient.send('order.findByUserId', userId);
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
