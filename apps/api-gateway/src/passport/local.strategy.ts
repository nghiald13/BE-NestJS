import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';


@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy
  ) {
    super({ usernameField: 'email' });
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await firstValueFrom(
      this.authClient.send(
        {cmd: 'auth.validate-user'},
        {
          username,
          password,
        }
      )
    );

    if (!user) {
      throw new UnauthorizedException();
    } else if (!user.isActive) throw new BadRequestException()
    return user;
  }
}
