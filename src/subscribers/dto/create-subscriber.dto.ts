import { IsAlphanumeric, IsEmail, IsNotEmpty, IsNumberString, IsOptional, Min, MinLength } from "class-validator";

export class CreateSubscriberDto {

    @IsNotEmpty()
    name: string

    @IsEmail()
    email: string

    @IsNumberString()
    @MinLength(10)
    phone: string

    @IsOptional()
    description: string
}
