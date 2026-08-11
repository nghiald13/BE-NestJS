import { Controller } from '@nestjs/common';
import { ProductsService } from './products.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // ===================== Static Routes =====================

  @MessagePattern({ cmd: 'product.findAll' })
  findAll(
    @Payload() { query, current, pageSize }
  ) {
    return this.productsService.findAll(query, +current, +pageSize);
  }

  @MessagePattern({ cmd: 'product.getDetail' })
  getDetailById(@Payload() productId: string[]) {
    return this.productsService.getDetailById(productId);
  }

  @MessagePattern({ cmd: 'product.getDistinctManufacturer' })
  getDistinctManufacturers() {
    return this.productsService.getDistinctManufacturers()
  }





  // ===================== Dynamic Routes =====================

  @MessagePattern({ cmd: 'product.findOne' })
  findOne(
    @Payload() { productId },
  ) {
    return this.productsService.findOne(productId);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
  //   return this.productsService.update(+id, updateProductDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.productsService.remove(+id);
  // }
}
