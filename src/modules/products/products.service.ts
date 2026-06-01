import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './schemas/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class ProductsService {

  constructor(
    @InjectModel(Product.name)
    private productModel: Model<Product>,
  ) { }

  create(createProductDto: CreateProductDto) {
    return 'This action adds a new product';
  }

  async findAll(query: string, current: number, pageSize: number) {

    const { filter } = aqp(query, {
      whitelist: ['kw', 'manufacturer']
    })

    const kw = filter.kw && typeof filter.kw !== 'object' ? String(filter.kw).trim() : ''
    delete filter.kw
    if (kw !== '') {
      const regexSearch = {
        $regex: kw,
        $options: 'i'
      }

      filter.name = regexSearch
    }

    if (!current) current = 1
    if (!pageSize) pageSize = 24

    const offset = (current - 1) * pageSize
    const results = await this.productModel
      .find(filter)
      .limit(pageSize)
      .skip(offset)
      .lean()

    const totalItems = await this.productModel.countDocuments(filter)
    const totalPages = Math.ceil(totalItems / pageSize)

    return {
      results: results,
      meta: {
        totalItems: totalItems,
        totalPages: totalPages
      }
    }
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} product`;
  // }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }

  async getDistinctManufacturers() {
    return this.productModel.distinct('manufacturer').exec()
  }
}
