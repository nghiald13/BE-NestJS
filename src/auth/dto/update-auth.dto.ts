import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateAuthDto {

}

export class VerifyAuthDto {
    @IsNotEmpty()
    _id: string;

    @IsNotEmpty()
    codeId: string;
}
