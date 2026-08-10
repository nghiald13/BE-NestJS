import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from '../../../../api-gateway/src/decorators/decor';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // ===================== Static Routes =====================
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get()
  findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.productsService.findAll(query, +current, +pageSize);
  }

  @Public()
  @Post(`getDetail`)
  getDetailById(@Body('productId') productId: string[]) {
    return this.productsService.getDetailById(productId);
  }

  @Public()
  @Get('meta/manufacturers')
  getDistinctManufacturers() {
    return this.productsService.getDistinctManufacturers()
  }





  // ===================== Dynamic Routes =====================
  @Public()
  @Get(':productId')
  findOne(@Param('productId') productId: string) {
    return this.productsService.findOne(productId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
