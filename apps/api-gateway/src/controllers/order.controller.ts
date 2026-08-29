import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
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
    create(@Body() dto: CreateOrderDto) {
        return firstValueFrom(this.orderClient.send('order.create', dto));
    }

    // ======================== DYNAMIC ROUTES ========================
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.orderClient.send('order.findOne', id);
    }
}
