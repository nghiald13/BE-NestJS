import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './schema/order.schema';
import { OrderDetails } from './schema/order_detail.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private orderModel = Model<Order>,

    @InjectModel(OrderDetails.name)
    private orderDetailsModel = Model<OrderDetails>

  ) {}
  create(createOrderDto: CreateOrderDto) {
    return 'This action adds a new order';
  }

  findAll() {
    return `This action returns all orders`;
  }

  async findOne(id: string) {
    const order = await this.orderModel.findOne({_id: id}).lean()
    if (!order)
      throw new BadRequestException("Invalid Order Id")
    const orderDetails = await this.orderDetailsModel
      .find({orderId: (order as any)._id})
      .select("productName price quantity")
      .lean()
    return {
      ...order,
      items: orderDetails
    }
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }

  async findByUserId(userId: string) {
    const result = await this.orderModel.find({
      userId: userId
    }).sort("-createdAt")

    return result
  }
}
