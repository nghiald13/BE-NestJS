import { Body, Controller, Inject, Post, Res, Request, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Public, ResponseMessage } from "apps/api-gateway/src/decorators/decor";
import { CreateAuthDto } from "apps/auth-service/src/modules/auth/dto/create-auth.dto";
import { VerifyAuthDto } from "apps/auth-service/src/modules/auth/dto/update-auth.dto";
import { JwtAuthGuard } from "apps/api-gateway/src/passport/jwt-auth.guard";
import { JwtRefreshGuard } from "apps/api-gateway/src/passport/jwt-refresh.guard";
import { LocalAuthGuard } from "apps/api-gateway/src/passport/local-auth.guard";
import { firstValueFrom } from "rxjs";
import { Response } from "express";

@Controller('auth')
export class AuthGatewayController {
    constructor(
        @Inject('AUTH_SERVICE')
        private readonly authClient: ClientProxy
    ) { }

    addRTokenIntoCookie(res: Response, { refresh_token, maxAge }) {
        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: true, // turn true when production, false dev
            sameSite: 'strict', // 'strict' when production, lax dev
            maxAge: maxAge * 1000 // in ms
        });
    }

    @Post('signin')
    @Public()
    @UseGuards(LocalAuthGuard)
    @ResponseMessage("Fetch SignIn")
    @HttpCode(HttpStatus.OK)
    async signIn(
        @Request() req,
        @Res({ passthrough: true }) res: Response,
    ) {

        const result = await firstValueFrom(
            this.authClient.send(
                { cmd: 'auth.signIn' },
                { user: req.user, }
            )
        );

        // add refresh_token into HttpOnly cookie
        this.addRTokenIntoCookie(res, {
            refresh_token: result.refresh_token,
            maxAge: result.maxAge
        });

        return {
            user: result.user,
            access_token: result.access_token
        };
    }

    @Public()
    @UseGuards(JwtAuthGuard)
    @Post('signup')
    signUp(@Body() signUpDto: CreateAuthDto) {
        // return this.authService.signUp(signUpDto);
        return this.authClient.send(
            { cmd: 'auth.signUp' },
            { signUpDto }
        );
    }

    @Public()
    @Post('verify')
    verify(@Body() verifyAuthDto: VerifyAuthDto) {
        // return this.authService.verify(verifyAuthDto);
        return this.authClient.send(
            { cmd: 'auth.verify' },
            { verifyAuthDto }
        );
    }

    @Public()
    @Post('sendEmail')
    sendEmail(@Body() obj: any) {
        // return this.authService.sendEmail(obj.email)
        return this.authClient.send(
            { cmd: 'auth.sendEmail' },
            { obj }
        );
    }

    @Public()
    @Post('google')
    async googleAuth(
        @Body() googleData: { avatar: string, email: string, name: string },
        @Res({ passthrough: true }) res: Response) {
        // return this.authService.googleSignIn(googleData, res)
        const result = await firstValueFrom(
            this.authClient.send(
                { cmd: 'auth.google' },
                { googleData }
            )
        );

        this.addRTokenIntoCookie(res, {
            refresh_token: result.refresh_token,
            maxAge: result.maxAge
        });

        return {
            user: result.user,
            access_token: result.access_token
        };
    }

    @Public()
    @Post('refresh')
    @UseGuards(JwtRefreshGuard)
    @ResponseMessage(`User's refreshToken has been renewed`)
    @HttpCode(HttpStatus.OK)
    async handleRefreshToken(
        @Request() req,
        // @Cookies('refresh_token') refresh_token: string
    ) {
        // return this.authService.processRefreshToken(req.user)
        return this.authClient.send(
            { cmd: 'auth.refreshToken' },
            { user: req.user }
        )
    }
}