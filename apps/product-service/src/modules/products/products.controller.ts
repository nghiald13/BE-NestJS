import { Controller } from '@nestjs/common';
import { ProductsService } from './products.service';
import { EventPattern, MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { KafkaEvent, TCPMessage } from 'libs/decorator/microservice-pattern.decorator';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // ===================== Static Routes =====================

  @TCPMessage('product.findAll')
  findAll(
    @Payload() { query, current, pageSize }
  ) {
    return this.productsService.findAll(query, +current, +pageSize);
  }

  @TCPMessage('product.getDetail')
  getDetailById(@Payload() productId: string[]) {
    return this.productsService.getDetailById(productId);
  }

  @TCPMessage('product.getBriefDetail')
  async getItem(@Payload() productId: string[]) {
    return this.productsService.getProducts(productId);
  }

  @TCPMessage('product.getDistinctManufacturer')
  getDistinctManufacturers() {
    return this.productsService.getDistinctManufacturers()
  }

  @TCPMessage('product.reserve')
  async reserveStock(@Payload() { items }: { items: { productId: Types.ObjectId; quantity: number }[] }) {
    return this.productsService.reserveStock(items);
  }

  // ===================== Events from Order =====================
  @KafkaEvent('order.create.failed')
  async refundStock(@Payload() { items }: { items: { productId: Types.ObjectId; quantity: number }[] }) {
    return this.productsService.refundStock(items);
  }




  // ===================== Dynamic Routes =====================

  @TCPMessage('product.findOne')
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
