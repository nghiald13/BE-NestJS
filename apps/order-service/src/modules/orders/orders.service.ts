import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, isValidObjectId, Model, Types } from 'mongoose';
import { Order } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { OutboxDocument, OutboxEvent } from 'apps/outbox/src/schemas/outbox.schema';

@Injectable()
export class OrdersService {
  constructor(

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

  async create(dto: CreateOrderDto) {
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
        total: subtotal + tax - discount + shipping
      }
    }
    const pricing = getPricing(items);

    // Reserve Stock
    const reserved = await firstValueFrom(this.productClient.send('product.reserve', { items: dto.items }))
    if (!reserved) throw new RpcException(reserved.message);

    const session = await this.connection.startSession();
    await session.startTransaction();
    let order;
    // Insert into DB
    try {
      order = new this.orderModel({
        userId: new Types.ObjectId(dto.userId),
        customerInfo: dto.customerInfo,
        items: items,
        pricing: pricing,
        status: 'PENDING_PAYMENT'
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
      console.log('Error while creating order! Rollback stock');
      // Compensate stock
      await this.outboxModel.create({
        topic: 'order.create.failed',
        payload: { items: dto.items },
      });
      throw new RpcException(error.message);
    }

    return order._id;
  }

  async paymentSuccessHandler({orderId}: {orderId: string}) {
    if (!isValidObjectId(orderId)) {
      console.log('Invalod Order Id Format!')
      return;
    }
    await this.orderModel.findOneAndUpdate({_id: new Types.ObjectId(orderId)}, {
      $set: {
        status: 'CONFIRMING',
      },
    })
    console.log(`Order ${orderId} has been paid`)
  }
}
