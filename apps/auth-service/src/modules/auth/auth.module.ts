import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
// import { UsersModule } from '../modules/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from '../../../../api-gateway/src/passport/local.strategy';
import { JwtStrategy } from '../../../../api-gateway/src/passport/jwt-access.strategy';
import { JwtRefreshStrategy } from '../../../../api-gateway/src/passport/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRES')
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule,

  ],
  controllers: [AuthController],
  providers: [
    AuthService,
  ],
})
export class AuthModule { }
