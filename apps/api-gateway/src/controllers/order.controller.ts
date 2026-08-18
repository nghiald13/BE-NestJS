import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from 'apps/order-service/src/modules/orders/dto/create-order.dto';
import { Microservice } from 'libs/enum/microservice.enum';

@Controller('order')
export class OrderGatewayController {
    constructor(
        @Inject(Microservice.ORDER_SERVICE)
        private readonly orderClient: ClientProxy
    ) { }

    // ======================== STATIC ROUTES ========================
    @Post('findByUserId')
    findByUserId(@Body() createOrderDto: CreateOrderDto) {
        return this.orderClient.send({ cmd: 'order.findByUserId' }, createOrderDto.userId);
    }

    @Post('create')
    create(@Body() dto: CreateOrderDto) {
        return this.orderClient.send({ cmd: 'order.create' }, dto)
    }

    // ======================== DYNAMIC ROUTES ========================
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.orderClient.send({ cmd: 'order.findOne' }, id);
    }
}
