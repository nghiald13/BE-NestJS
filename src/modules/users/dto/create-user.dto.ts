import { IsEmail, IsEmpty, IsNotEmpty, IsStrongPassword } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty({ message: "name không được để trống" })
    name: string;

    @IsNotEmpty({ message: "email không được để trống" })
    @IsEmail({}, { message: "email không đúng định dạng" })
    email: string;

    @IsNotEmpty({ message: "password không được để trống" })
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 1,
        minUppercase: 1
    }, { message: "Mật khẩu không đủ mạnh" })
    password: string;

    phone: string;
    address: string;
    image: string;
    codeSecret: string;
    codeId: string;
    codeExpired: string;
}
