import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Order } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('PAYMENT_SERVICE')
    private readonly paymentClient: ClientProxy,

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
      this.productClient.send({ cmd: 'product.getBriefDetail' }, dto.items.map(item => item.productId))
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
    const orderCode = `ORD_${Date.now()}`;

    // Reserve Stock
    const reserved = await firstValueFrom(this.productClient.send({cmd: 'product.reserve'}, {items: dto.items}))
    if (!reserved) throw new RpcException(reserved.message);

    let order;
    // Insert into DB
    try {
      order = await this.orderModel.create({
        userId: new Types.ObjectId(dto.userId),
        orderCode: orderCode,
        customerInfo: dto.customerInfo,
        items: items,
        pricing: pricing,
        status: 'PENDING_PAYMENT'
      })
    } catch (error: any) {
      console.log('Error while creating order! Process to refund stock');
      // Refund Stock
      this.productClient.emit('order.create.failed', {items: dto.items});
      throw new RpcException(error.message);
    }

    // Announce order.created for Payment
    this.paymentClient.emit('order.created', {
      method: dto.payMethod,
      orderId: order._id,
      orderCode: orderCode,
      amount: pricing.total,
    });

    return order._id;
  }
}
