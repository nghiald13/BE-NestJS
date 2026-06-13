
import { Body, Controller, Post, UseGuards, Request, Get, Response } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public, ResponseMessage } from '../decorators/decor';
import { CreateAuthDto } from './dto/create-auth.dto';
import { VerifyAuthDto } from './dto/update-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('signin')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ResponseMessage("Fetch SignIn")
  signIn(@Request() req) {
    return this.authService.signIn(req.user);
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post('signup')
  signUp(@Body() signUpDto: CreateAuthDto) {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @Post('verify')
  verify(@Body() verifyAuthDto: VerifyAuthDto) {
    return this.authService.verify(verifyAuthDto);
  }

  @Public()
  @Post('sendEmail')
  sendEmail(@Body() obj: any) {
    return this.authService.sendEmail(obj.email)
  }

  @Public()
  @Post('google')
  async googleAuth(@Body() googleData: any) {
    return this.authService.googleSignIn(googleData)
  }

}
