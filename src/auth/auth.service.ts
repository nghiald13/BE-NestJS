
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { cmpPassword } from '../helpers/utilities';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    const isPasswordMatched = await cmpPassword(pass, user.password)
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    const payload = { _id: user._id, email: user.email };
    return {
      // 💡 Here the JWT secret key that's used for signing the payload 
      // is the key that was passed in the JwtModule
      access_token: await this.jwtService.signAsync(payload),
    }
  }
}
