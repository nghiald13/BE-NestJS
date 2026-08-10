import { Body, Controller, Inject, Post, Res, Request, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Public, ResponseMessage } from "apps/api-gateway/src/decorators/decor";
import { CreateAuthDto } from "apps/auth-service/src/modules/auth/dto/create-auth.dto";
import { VerifyAuthDto } from "apps/auth-service/src/modules/auth/dto/update-auth.dto";
import { JwtAuthGuard } from "apps/api-gateway/src/passport/jwt-auth.guard";
import { JwtRefreshGuard } from "apps/api-gateway/src/passport/jwt-refresh.guard";
import { LocalAuthGuard } from "apps/api-gateway/src/passport/local-auth.guard";

@Controller('auth')
export class AuthGatewayController {
    constructor(
        @Inject('AUTH_SERVICE')
        private readonly authClient: ClientProxy
    ) { }

    @Post('signin')
    @Public()
    @UseGuards(LocalAuthGuard)
    @ResponseMessage("Fetch SignIn")
    signIn(
        @Request() req,
        @Res({ passthrough: true }) res: Response) {
        // return this.authService.signIn(req.user, res);
        return this.authClient.send(
            { cmd: 'auth.signIn' },
            {
                user: req.user,
                res,
            }
        );
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
    async googleAuth(@Body() googleData: any, @Res({ passthrough: true }) res: Response) {
        // return this.authService.googleSignIn(googleData, res)
        return this.authClient.send(
            { cmd: 'auth.google' },
            { googleData, res }
        )
    }

    @Public()
    @Post('refresh')
    @UseGuards(JwtRefreshGuard)
    async handleRefreshToken(
        @Request() req,
        // @Cookies('refresh_token') refresh_token: string
    ) {
        // return this.authService.processRefreshToken(req.user)
        return this.authClient.send(
            { cmd: 'auth.refreshToken' },
            { req }
        )
    }
}