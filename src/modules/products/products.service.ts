import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './schemas/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
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
      whitelist: ['kw', 'manufacturer'],

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

    if (filter.manufacturer !== 'string' && Array.isArray(filter.manufacturer))
      delete filter.manufacturer

    if (!current) current = 1
    if (!pageSize) pageSize = 24

    const offset = (current - 1) * pageSize
    const results = await this.productModel
      .find(filter)
      .limit(pageSize)
      .skip(offset)
      .select("-specifications -descriptionJson -updatedAt")
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

  async findOne(productId: string) {
    if (!isValidObjectId(productId)) throw new BadRequestException("Incorrect productId format")
    const product = await this.productModel.findOne({
      _id: productId
    })
    if (!product) throw new BadRequestException("Non-existed product")
    return product
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }

  async getDistinctManufacturers() {
    return this.productModel.distinct('manufacturer').exec()
  }

  async getStatistics() {

    const stats = await this.productModel.aggregate([{
      $group: {
        _id: null, // get all products
        totalItems: { $sum: 1 },
        totalInStock: {
          $sum: { $cond: [{ $gte: ["in_stock", 100] }, 1, 0] }
        },
        totalLowStock: {
          $sum: { $cond: [{ $lt: ["in_stock", 100] }, 1, 0] }
        },
        totalOutOfStock: {
          $sum: { $cond: [{ $eq: ["in_stock", 0] }, 1, 0] }
        },
      }
    }]).exec()

    return {
      totalItems: stats[0].totalItems,
      totalInStock: stats[0].totalInStock,
      totalLowStock: stats[0].totalLowStock,
      totalOutOfStock: stats[0].totalOutOfStock
    }
  }
}
