import { Injectable } from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Subscriber } from './schemas/subscriber.schema';
import { Model } from 'mongoose';

@Injectable()
export class SubscribersService {

  constructor(
    @InjectModel(Subscriber.name)
    private subsriberModel: Model<Subscriber>,

  ) { }

  async create(createSubscriberDto: CreateSubscriberDto) {
    const result = await this.subsriberModel.insertOne({
      name: createSubscriberDto.name,
      phone: createSubscriberDto.phone,
      email: createSubscriberDto.email,
      description: createSubscriberDto.description
    })

    return result
  }

  // findAll() {
  //   return `This action returns all subscribers`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} subscriber`;
  // }

  // update(id: number, updateSubscriberDto: UpdateSubscriberDto) {
  //   return `This action updates a #${id} subscriber`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} subscriber`;
  // }
}
