import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { isValidObjectId, Model } from 'mongoose';
import { hashPasswordHelper } from '../../helpers/utilities';
import aqp from 'api-query-params';
import { CreateAuthDto } from '../../auth/dto/create-auth.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { generate, generateSecret, verify } from 'otplib';
import { VerifyAuthDto } from '../../auth/dto/update-auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly mailerService: MailerService,
  ) { }

  isEmailExist = async (email: string) => {
    const user = await this.userModel.exists({ email: email })
    if (user) return true
    return false
  }

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, phone, address, image } = createUserDto

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

  async signUp(signUpDto: CreateAuthDto) {
    const { name, email, password } = signUpDto

    //check email
    const isEmailExist = await this.isEmailExist(email)
    if (isEmailExist) {
      throw new BadRequestException(`${email} đã được đăng ký. Quên mật khẩu?`)
    }

    //hash password
    const hashPassword = await hashPasswordHelper(password)

    //generate OTPSecret
    const codeSecret = generateSecret()

    //Create User
    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      isActive: false,
      codeSecret: codeSecret,
    })

    //response
    return {
      _id: user._id
    };

  }

  async verifyAccount(verifyAuthDto: VerifyAuthDto) {
    try {
      const user = await this.userModel.findOne(
        { email: verifyAuthDto.email }
      )
      if (!user) throw new BadRequestException();

      const result = await verify({
        secret: user.codeSecret,
        token: verifyAuthDto.codeId,
        epochTolerance: 150
      })

      if (result.valid) {
        await user.updateOne({
          isActive: true
        })
        return true
      }
      return false
    } catch (error) {
      return false
    }

  }

  async sendVerificationEmail(email: string) {
    console.log(">>> [SendEmail] Bắt đầu xử lý cho email:", email);
    const user = await this.userModel.findOne(
      { email: email }
    )
    if (!user) {
      console.log(`>>> [SendEmail] Thất bại: Không tìm thấy user với email ${email}`);
      throw new BadRequestException("Invalid Email")
    }

    try {
      //Generate OTP 6 digits
      const codeId = await generate({
        secret: user.codeSecret,
      })

      console.log(">>> [SendEmail] Đã tạo thành công OTP Code:", codeId);
      console.log(">>> [SendEmail] Chuẩn bị gọi mailerService.sendMail...");

      const mailResult = await this.mailerService.sendMail({
        to: user.email,
        subject: 'Verify your email to activate account @Fullstack',
        template: 'register',
        context: {
          name: user?.name ?? user.email,
          activationCode: codeId
        },
      });
      console.log(">>> [SendEmail] GỬI MAIL THÀNH CÔNG! Phản hồi từ Mail Server:", mailResult);
    } catch (error: any) {
      console.error(">>> [SendEmail] LỖI TRONG QUÁ TRÌNH GỬI MAIL:");
      console.error("- Message:", error?.message);
      console.error("- Code (SMTP):", error?.code);
      console.error("- Stack Trace:", error?.stack);
      throw new BadRequestException(error)
    }
    return {
      isSent: true
    }
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, limit, skip, sort } = aqp(query, {
      whitelist: ['kw']
    })

    const kw = filter.kw && typeof filter.kw !== 'object' ? String(filter.kw).trim() : ''
    delete filter.kw
    if (kw !== '') {
      const regexSearch = {
        $regex: kw,
        $options: 'i'
      }

      filter.$or = [
        { name: regexSearch },
        { email: regexSearch },
      ]

    }

    //Pagination
    if (!current) current = 1
    if (!pageSize) pageSize = 25
    const totalItems = await this.userModel.countDocuments(filter)
    const totalPages = Math.ceil(totalItems / pageSize)
    const offset = (current - 1) * pageSize

    const results = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(offset)
      .sort(sort as any)
      .select("-password -codeSecret") //which means to select every fields EXCEPT password
      .lean() // query faster for read-only purpose

    return {
      results,
      meta: {
        "totalItems": totalItems,
        "totalPages": totalPages
      }
    };
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email })
  }

  async update(updateUserDto: UpdateUserDto) {
    const result = await this.userModel.updateOne(
      { _id: updateUserDto._id },
      { ...updateUserDto }
    )
    return result;
  }

  //Remove a user WITHOUT making new DeleteUserDto
  async remove(_id: string) {
    //Check whether _id is valid MongoDB Object Id
    if (isValidObjectId(_id)) {
      //Process to delete
      return await this.userModel.deleteOne({ _id })
    } else {
      //Handling Exception
      throw new BadGatewayException('Invalid Object id')
    }
  }
}
