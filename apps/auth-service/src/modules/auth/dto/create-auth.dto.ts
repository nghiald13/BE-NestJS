import { IsEmail, IsNotEmpty, IsStrongPassword } from "class-validator";

export class CreateAuthDto {
    @IsNotEmpty()
    @IsEmail()
    email: string

    @IsNotEmpty()
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 1,
        minUppercase: 1
    }, { message: "Mật khẩu không đủ mạnh" })
    password: string

    @IsNotEmpty()
    name: string
}