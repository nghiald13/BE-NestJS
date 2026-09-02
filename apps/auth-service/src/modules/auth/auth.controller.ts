
import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateAuthDto, VerifyAuthDto } from 'libs/shared-modules/dto/auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }


  @MessagePattern({ cmd: 'auth.validate-user' })
  async validateUser(@Payload() { username, password }) {
    return this.authService.validateUser(username, password);
  }

  @MessagePattern({ cmd: 'auth.signIn' })
  async signIn(
    @Payload() { user }
  ) {
    return this.authService.signIn(user);
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
  async googleAuth(@Payload() { googleData }) {
    return this.authService.googleSignIn(googleData)
  }

  @MessagePattern({ cmd: 'auth.refreshToken' })
  async handleRefreshToken(
    @Payload() {user}
  ) {
    return this.authService.processRefreshToken(user)
  }

}
