
import { Body, Controller, Post, UseGuards, Request, Get, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../../../../api-gateway/src/passport/local-auth.guard';
import { JwtAuthGuard } from '../../../../api-gateway/src/passport/jwt-auth.guard';
import { Cookies, Public, ResponseMessage } from '../../../../api-gateway/src/decorators/decor';
import { CreateAuthDto } from './dto/create-auth.dto';
import { VerifyAuthDto } from './dto/update-auth.dto';
import { JwtRefreshGuard } from '../../../../api-gateway/src/passport/jwt-refresh.guard';
import { Response } from 'express';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }


  @MessagePattern({cmd: 'auth.validate-user'})
  async validateUser(@Payload() {username, password}) {
    return this.authService.validateUser(username, password);
  }

  @MessagePattern({ cmd: 'auth.signIn' })
  async signIn(
    @Payload() data: { user, res }
  ) {
    return this.authService.signIn(data.user, data.res);
  }

  @MessagePattern({ cmd: 'auth.signUp' })
  async signUp(@Payload() signUpDto: CreateAuthDto) {
    return this.authService.signUp(signUpDto);
  }


  @MessagePattern({ cmd: 'auth.verify' })
  async verify(@Payload() verifyAuthDto: VerifyAuthDto) {
    return this.authService.verify(verifyAuthDto);
  }


  @MessagePattern({ cmd: 'auth.sendEmail' })
  async sendEmail(@Payload() obj: any) {
    return this.authService.sendEmail(obj.email)
  }


  @MessagePattern({ cmd: 'auth.google' })
  async googleAuth(@Payload() data: { googleData, res }) {
    return this.authService.googleSignIn(data.googleData, data.res)
  }

  @MessagePattern({ cmd: 'auth.refreshToken' })
  async handleRefreshToken(
    @Payload() req
  ) {
    return this.authService.processRefreshToken(req.user)
  }

}
