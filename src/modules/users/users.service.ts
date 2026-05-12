import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { isValidObjectId, Model } from 'mongoose';
import { hashPasswordHelper } from '../../helpers/utilities';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>
  ) {}

  isEmailExist = async(email: string) => {
    const user = await this.userModel.exists({email: email})
    if (user) return true
    return false
  }

  async create(createUserDto: CreateUserDto) {
    const {name, email, password, phone, address, image} = createUserDto

    //check email
    const isEmailExist = await this.isEmailExist(email)
    if (isEmailExist) {
      throw new BadRequestException(`${email} đã được đăng ký. Quên mật khẩu?`)
    }

    //hash password
    const hashPassword = await hashPasswordHelper(password)
    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      phone,
      address,
      image,
    })

    return {
      _id: user._id
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const {filter, limit, skip, sort} = aqp(query)
    //As AQP Docs filter doesn't have current&pageSize params
    if (filter.current) delete filter.current
    if (filter.pageSize) delete filter.pageSize
    //Pagination
    if (!current) current = 1
    if (!pageSize) pageSize = 1
    const totalItems = (await (this.userModel.find(filter))).length
    const totalPages = Math.ceil(totalItems / pageSize)
    const offset = (current - 1) * pageSize

    const results = await this.userModel
    .find(filter)
    .limit(pageSize)
    .skip(offset)
    .sort(sort as any)
    .select("-password") //which means to select every fields EXCEPT password

    return {results, totalPages};
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({email})
  }

  async update(updateUserDto: UpdateUserDto) {
    const result = await this.userModel.updateOne(
      {_id: updateUserDto._id},
      {...updateUserDto}
    )
    return result;
  }

  //Remove a user WITHOUT making new DeleteUserDto
  async remove(_id: string) {
    //Check whether _id is valid MongoDB Object Id
    if (isValidObjectId(_id)) {
      //Process to delete
      return await this.userModel.deleteOne({_id})
    } else {
      //Handling Exception
      throw new BadGatewayException('_id không hợp lệ')
    }
  }
}
