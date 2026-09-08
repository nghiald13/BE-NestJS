import { Controller, Get, Post, Body, Param, Query, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Public, ResponseMessage } from '../decorators/decor';
import { firstValueFrom } from 'rxjs';

@Controller('products')
export class ProductGatewayController {
    constructor(
        @Inject('PRODUCT_SERVICE')
        private readonly productClient: ClientProxy
    ) { }

    // ===================== Static Routes =====================

    @Public()
    @Get()
    async findAll(
        @Query() query: string,
        @Query('current') current: string,
        @Query('pageSize') pageSize: string,
    ) {
        return await firstValueFrom(
            this.productClient.send('product.findAll', {
                query, current, pageSize
            })
        );
    }

    @Public()
    @Post(`getBriefDetail`)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Fetch Product Brief Detail')
    getDetailById(@Body('productId') productId: string[]) {
        return this.productClient.send('product.getBriefDetail', productId)
    }

    @Public()
    @Get('meta/manufacturers')
    getDistinctManufacturers() {
        return this.productClient.send('product.getDistinctManufacturer', {})
    }

    // ===================== Dynamic Routes =====================
    @Public()
    @Get(':productId')
    findOne(
        @Param('productId') productId: string,
    ) {
        return this.productClient.send('product.findOne', {
            productId,
        });
    }
}
