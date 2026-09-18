import { BadRequestException, ConflictException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
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
import { PaymentStatus } from 'libs/enum/payment.enum';
import { OrderStatus } from 'libs/enum/order.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly redisService: RedisService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,

    @InjectModel(OutboxEvent.name)
    private readonly outboxModel = Model<OutboxDocument>,

    @Inject('PAYMENT_SERVICE')
    private readonly paymentClient: ClientProxy,

    @Inject('PRODUCT_SERVICE')
    private readonly productClient: ClientProxy,

    @InjectModel(Order.name)
    private orderModel = Model<Order>,

    @InjectQueue('ORDER_QUEUE')
    private readonly orderQueue: Queue,

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
    const result = await this.orderModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $project: {
          amount: "$pricing.total",
          status: 1,
          items: 1,
          createdAt: 1,
          expiresAt: 1,
        }
      },
      { $sort: { createdAt: -1 } },
    ])

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
        image: product.image,
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
        status: OrderStatus.PAYMENTPENDING,
        expiresAt: dayjs().add(13, 'minutes').toDate(),
      });
      await order.save({ session });

      // Add Scheduled Job: order.auto-check:${orderId}
      await this.orderQueue.add('order.auto-check', {
        orderId: order._id.toString()
      }, {
        jobId: `order.auto-check-${order._id.toString()}`,
        delay: dayjs(order.expiresAt).diff(dayjs()),
        removeOnComplete: true,
        removeOnFail: true,
      });

      // Announce event order.created
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
      console.log(`Rolling back ${reserved ? dto.items.length : 0} items due to deduction while creating`)
      await this.outboxModel.create({
        topic: `order.create.failed`,
        payload: {
          items: reserved ? dto.items : null
        }
      });
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

  async cancel({ idempotencyKey, orderId, userId }: { idempotencyKey: string, orderId: string, userId: string }) {

    const cacheKey = `order:cancel:${idempotencyKey}`
    const cacheValue: { status: string } = await this.cacheManager.get(cacheKey);
    if (cacheValue?.status) return cacheValue.status;
    const cacheable = await this.redisService.setNLock(cacheKey, { status: 'PROCESSING' }, 30 * 1000);
    if (!cacheable) return new RpcException({
      statusCode: HttpStatus.CONFLICT,
      message: "Request Cancel Order is being processed. Please wait!",
    });

    // Get corresponding Order
    const [order] = await this.orderModel.aggregate([
      { $match: { _id: new Types.ObjectId(orderId), userId: new Types.ObjectId(userId) } },
      {
        $project: {
          _id: 1,
          "items.productId": 1,
          "items.quantity": 1,
          status: 1,
        }
      }
    ]);
    if (!order) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Order not found!"
    })

    // Allow only Unconfirmed Order (included payment pending)
    const { status } = order;
    const unconfirmedStatus = [
      OrderStatus.PAYMENTPENDING,
      OrderStatus.CONFIRMING
    ];
    if (!unconfirmedStatus.includes(status)) throw new RpcException({
      statusCode: HttpStatus.FORBIDDEN,
      message: "Current Order status does not allow to cancel!!",
    })

    // Cancel Order business
    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      // Update Order status
      await this.orderModel.updateOne({ _id: order._id }, {
        $set: { status: OrderStatus.CANCELLED }
      }, { session });

      // Emit event order.cancelled
      await this.outboxModel.create([{
        topic: 'order.cancelled',
        payload: {
          orderId: order._id,
          items: order.items,
        }
      }], { session });

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      this.logger.log(`There was an error while cancelling order ${order._id}, trace: ${error}`);
      throw new RpcException(error);
    }
  }

  async paymentSuccessHandler({ orderId }: { orderId: string }) {
    if (!isValidObjectId(orderId)) {
      console.log('Invalod Order Id Format!')
      return;
    }
    await this.orderModel.findOneAndUpdate({ _id: new Types.ObjectId(orderId) }, {
      $set: {
        status: OrderStatus.CONFIRMING,
      },
    })
    console.log(`Order ${orderId} has been paid`)
  }

  async autoCheck(orderId: string) {
    const paymentStatus = await firstValueFrom(this.paymentClient.send('payment.query-status', orderId));
    // case CANCELLED: do update status -> emit event order.cancelled
    if (paymentStatus === PaymentStatus.CANCELLED) {
      await this.orderModel.findOneAndUpdate({ _id: new Types.ObjectId(orderId) }, {
        $set: {
          status: OrderStatus.CANCELLED,
        }
      })
      const { items } = await this.orderModel
        .findById(new Types.ObjectId(orderId))
        .select("items")
      await this.outboxModel.create({
        topic: 'order.cancelled',
        payload: {
          items
        },
      })
    } else if (paymentStatus === PaymentStatus.FINALIZING) {
      throw new ConflictException(`Order ${orderId} has Payment finalizing. Delay the job another 2 min!`)
    }

  }
}
