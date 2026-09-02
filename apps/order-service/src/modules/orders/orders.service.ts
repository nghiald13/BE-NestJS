import { BadRequestException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, isValidObjectId, Model, Types } from 'mongoose';
import { Order } from './schema/order.schema';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { OutboxDocument, OutboxEvent } from 'libs/shared-modules/outbox/src/schemas/outbox.schema';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisService } from 'libs/shared-modules/redis/redis.service';
import dayjs from 'dayjs';
import { CreateOrderDto } from 'libs/shared-modules/dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly redisService: RedisService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,

    @InjectModel(OutboxEvent.name)
    private readonly outboxModel = Model<OutboxDocument>,

    // @Inject('PAYMENT_SERVICE')
    // private readonly paymentClient: ClientProxy,

    @Inject('PRODUCT_SERVICE')
    private readonly productClient: ClientProxy,

    @InjectModel(Order.name)
    private orderModel = Model<Order>,

    @InjectConnection()
    private readonly connection: Connection,
  ) { }

  async findOne(id: string) {
    const order = await this.orderModel
      .findOne({ _id: id })
      .select("-createdAt -updatedAt")
      .lean()
    if (!order)
      throw new BadRequestException("Invalid Order Id")
    return order;
  }

  async findByUserId(userId: string) {
    const result = await this.orderModel.find({
      userId: userId
    }).sort("-createdAt")

    return result
  }

  async create({ idempotencyKey, dto }: { idempotencyKey: string, dto: CreateOrderDto }) {

    // Attempt to get from cache
    const cacheKey = `order:create:${idempotencyKey}`;
    const cacheValue: { status: string, orderId: string } = await this.cacheManager.get(cacheKey);
    if (cacheValue?.orderId) return cacheValue.orderId;
    // Attempt to cache, if cacheKey existed, handle idempotency
    const cacheable = await this.redisService.setNLock(cacheKey, { status: 'PROCESSING', }, 30 * 1000);
    if (!cacheable) throw new RpcException({
      statusCode: HttpStatus.CONFLICT,
      message: "Request Order is being processed. Please wait!"
    });

    // Get Items brief detail (id, name, price)
    const orderItems = await firstValueFrom(
      this.productClient.send('product.getBriefDetail', dto.items.map(item => item.productId))
    );
    // Map quantities into above items
    const items = dto.items.map(item => {
      const product = orderItems.find(p => p._id.toString() === item.productId);
      return {
        productId: new Types.ObjectId(product._id),
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      }
    })
    // Calculate pricing function
    const getPricing = (items: { productId: Types.ObjectId, price: number, quantity: number }[]) => {
      const subtotal = items.reduce((subtotal, item) => subtotal + item.price * item.quantity, 0);
      const tax = subtotal * 0.08;
      const discount = 0;
      const shipping = 0;

      return {
        subtotal,
        tax,
        discount,
        shipping,
        total: Math.ceil(subtotal + tax - discount + shipping),
      }
    }
    const pricing = getPricing(items);

    let order, reserved;
    const session = await this.connection.startSession();
    await session.startTransaction();
    // Insert into DB
    try {
      // Reserve Stock
      reserved = await firstValueFrom(this.productClient.send('product.reserve', { items: dto.items }))
      order = new this.orderModel({
        userId: new Types.ObjectId(dto.userId),
        customerInfo: dto.customerInfo,
        items: items,
        pricing: pricing,
        status: 'PENDING_PAYMENT',
        expiresAt: dayjs().add(10, 'minutes').toDate(),
      });
      await order.save({ session })

      await this.outboxModel.create([{
        topic: 'order.created',
        payload: {
          method: dto.payMethod,
          orderId: order._id,
          amount: pricing.total,
        },
      }], { session });

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      console.log('Error while creating order!');
      // Compensate stock if deducted
      if (reserved) {
        console.log(`Rolling back stock due to deduction while creating`)
        await this.productClient.send('product.refund', {items: dto.items});
      }
      // Release cache so can try again
      await this.redisService.release(cacheKey);
      throw new RpcException(error);
    }
    await this.cacheManager.set(cacheKey, {
      status: 'SUCCESS',
      orderId: order._id.toString(),
    });
    return order._id;
  }

  async paymentSuccessHandler({ orderId }: { orderId: string }) {
    if (!isValidObjectId(orderId)) {
      console.log('Invalod Order Id Format!')
      return;
    }
    await this.orderModel.findOneAndUpdate({ _id: new Types.ObjectId(orderId) }, {
      $set: {
        status: 'CONFIRMING',
      },
    })
    console.log(`Order ${orderId} has been paid`)
  }
}
