
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { cmpPassword } from '../helpers/utilities';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    const isPasswordMatched = await cmpPassword(pass, user.password)
    if (!user || !isPasswordMatched) return null
    return user
  }

  async signIn(user: any) {
    const payload = { sub: user._id, username: user.email };
    return {
      // 💡 Here the JWT secret key that's used for signing the payload 
      // is the key that was passed in the JwtModule
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
      access_token: await this.jwtService.signAsync(payload),
    }
  }

  signUp = async(signUpDto: CreateAuthDto) => {
    return await this.usersService.signUp(signUpDto)
  }
}
