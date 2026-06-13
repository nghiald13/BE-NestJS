
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { cmpPassword } from '../helpers/utilities';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { VerifyAuthDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    try {
      const user = await this.usersService.findByEmail(username);
      const isPasswordMatched = await cmpPassword(pass, user.password)
      if (!isPasswordMatched) throw new Error
      return user
    } catch (error) { // If it goes here, either email or password wrong
      return null
    }
  }

  async signIn(user: any) {
    const payload = { sub: user._id, username: user.email, role: user.role };
    return {
      // 💡 Here the JWT secret key that's used for signing the payload 
      // is the key that was passed in the JwtModule
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      access_token: await this.jwtService.signAsync(payload),
    }
  }

  async googleSignIn(googleUser: any) {
    // Call service that return an user, if user doesn't exist, create one and return user
    const user = await this.usersService.signInOrSignUp(googleUser)
    return await this.signIn(user)
  }

  signUp = async (signUpDto: CreateAuthDto) => {
    return await this.usersService.signUp(signUpDto)
  }

  verify = async (verifyAuthDto: VerifyAuthDto) => {
    return await this.usersService.verifyAccount(verifyAuthDto)
  }

  sendEmail = async (email: string) => {
    return await this.usersService.sendVerificationEmail(email)
  }
}
