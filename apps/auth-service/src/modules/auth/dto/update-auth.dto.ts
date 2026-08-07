import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateAuthDto {

}

export class VerifyAuthDto {
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    codeId: string;
}
