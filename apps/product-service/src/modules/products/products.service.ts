import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, isValidObjectId, Model, Types } from 'mongoose';
import aqp from 'api-query-params';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BulkProductDto, BulkProductItemDto } from '../../../../nest-app/src/admin/dto/create-admin.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService {

  constructor(
    @InjectModel(Product.name)
    private productModel: Model<Product>,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,

    @InjectConnection()
    private readonly connection: Connection,
  ) { }

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

    // Attempt to get from cache frist
    const cacheKey = `product:${productId}`
    const cacheValue = await this.cacheManager.get(cacheKey)
    if (cacheValue) {
      console.log(`${cacheKey} found in Redis Caches`)
      return cacheValue
    }

    // If product hasn't been cached
    console.log(`${cacheKey} not found in Redis Caches. Processing to fetch from DB and cache data`)
    if (!isValidObjectId(productId)) throw new BadRequestException("Incorrect productId format")
    const product = await this.productModel.findOne({
      _id: productId
    })
    if (!product) throw new BadRequestException("Non-existed product")

    // Cache product if found any
    await this.cacheManager.set(cacheKey, product)
    console.log(`Cached ${cacheKey} into Redis`)

    return product
  }

  // Business function for Basic Detail display (cart)
  async getDetailById(productId: string[]) {
    const result = await this.productModel
      .find({ _id: { $in: productId } })
      .select("-specification -description -status -createdAt -updatedAt")
    return result
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }

  async getDistinctManufacturers() {

    const cacheKey = `product:manufacturers`
    const cacheValue = await this.cacheManager.get(cacheKey)
    if (cacheValue) {
      // console.log(`${cacheKey} found in Redis Caches`)
      return cacheValue
    } else {
      // console.log(`${cacheKey} not found in Redis Caches. Processing to fetch from DB and cache data`)
    }

    const manufacturers = await this.productModel.distinct('manufacturer').exec()
    await this.cacheManager.set(cacheKey, manufacturers)
    // console.log(await this.cacheManager.get(cacheKey))

    return manufacturers
  }

  // Business function to get name
  async getProducts(productId: string[]) {
    const products = await this.productModel
      .find({ _id: { $in: productId } })
      .select('name price')
      .lean()

    return products
  }

  async reserveStock(items: { productId: Types.ObjectId; quantity: number }[]) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      for (const item of items) {
        const updated = await this.productModel.findOneAndUpdate(
          { _id: item.productId, in_stock: { $gte: item.quantity } },
          { $inc: { in_stock: -item.quantity } },
          { session, new: true },
        );
        if (!updated) {
          throw new RpcException(`Sản phẩm ${item.productId} không đủ hàng`);
        }
      }
      await session.commitTransaction();
      return true;
    } catch (error: any) {
      await session.abortTransaction();
      console.log(error.message);
    } finally {
      session.endSession();
    }
    return false;
  }

  async refundStock(items: { productId: Types.ObjectId; quantity: number }[]) {

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { in_stock: item.quantity } },
      },
    }));
    await this.productModel.bulkWrite(bulkOps);
    console.log(`Refunded Stock: ${items}`)
  }



  // Admin Businesses
  async addBulkProduct(bulkProductDto: BulkProductDto) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const products: Partial<Product>[] = bulkProductDto.items.map(p => ({
        name: p.name,
        price: p.price,
        manufacturer: p.manufacturer,
        in_stock: p.in_stock,
        image: p.image,
        specification: p.specification,
        description: p.description,
        status: "OUT_OF_STOCK"
      }))
      await this.productModel.insertMany(products, { session })
      await session.commitTransaction();

      return {
        message: `Added ${products.length} items into products schema`
      }
    } catch (error) {
      await session.abortTransaction();
    } finally {
      session.endSession();
    }

    return {
      error: "Internal Server Error",
      message: "There was an error while adding products"
    }
  }


  async getStatistics() {
    const [stats] = await this.productModel.aggregate([{
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalInStock: { $sum: { $cond: [{ $eq: ['$status', 'IN_STOCK'] }, 1, 0] } },
        totalLowStock: { $sum: { $cond: [{ $eq: ['$status', 'LOW_STOCK'] }, 1, 0] } },
        totalOutOfStock: { $sum: { $cond: [{ $eq: ['$status', 'OUT_OF_STOCK'] }, 1, 0] } },
      },
    }]).exec()

    return stats
  }
}

