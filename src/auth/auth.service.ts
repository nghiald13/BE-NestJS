
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { cmpPassword } from '../helpers/utilities';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { VerifyAuthDto } from './dto/update-auth.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
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

  async signIn(user: any, response: any) {

    // generate refresh token and access token
    const payload = { sub: user._id, username: user.email, role: user.role };
    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: +this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES')
    })
    const access_token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: +this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES')
    })

    // update user's refresh_token in DB
    await this.usersService.updateRefreshToken(user._id, refresh_token)

    // add refresh_token into HttpOnly cookie
    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true, // turn true when production, false dev
      sameSite: 'strict', // 'strict' when production, lax dev
      maxAge: +this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES') * 1000 // in ms
    });

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
      access_token: access_token,
    }
  }

  async processRefreshToken(user: any) {
    const u = await this.usersService.findByEmail(user.email)
    if (!u || u.refresh_token !== user.refresh_token) {
      throw new UnauthorizedException("Invalid session")
    }

    const payload = {
      sub: u._id,
      username: u.email,
      role: u.role,
      
    }

    return {
      access_token: await this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: +this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES')
      })
    }
  }

  async googleSignIn(googleUser: any, response: any) {
    // Call service that return an user, if user doesn't exist, create one and return user
    const user = await this.usersService.signInOrSignUp(googleUser)
    return await this.signIn(user, response)
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
