import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Public } from '../decorators/decor';
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
        // return this.productsService.findAll(query, +current, +pageSize);
        return await firstValueFrom(
            this.productClient.send({ cmd: 'product.findAll' }, {
                query, current, pageSize
            })
        );
    }

    // @Public()
    // @Post(`getDetail`)
    // getDetailById(@Body('productId') productId: string[]) {
    //     return this.productsService.getDetailById(productId);
    // }

    // @Public()
    // @Get('meta/manufacturers')
    // getDistinctManufacturers() {
    //     return this.productsService.getDistinctManufacturers()
    // }





    // ===================== Dynamic Routes =====================
    // @Public()
    // @Get(':productId')
    // findOne(@Param('productId') productId: string) {
    //     return this.productsService.findOne(productId);
    // }

    // @Patch(':id')
    // update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    //     return this.productsService.update(+id, updateProductDto);
    // }

    // @Delete(':id')
    // remove(@Param('id') id: string) {
    //     return this.productsService.remove(+id);
    // }
}
