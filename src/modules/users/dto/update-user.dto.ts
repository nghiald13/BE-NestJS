import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsEmail, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateUserDto {
    @IsMongoId({ message: '_id không hợp lệ' })
    @IsNotEmpty({ message: '_id không được để trống' })
    _id: string;

    @IsOptional()
    name: string;

    @IsEmail()
    @IsOptional()
    email: string;

    @IsOptional()
    @IsBoolean()
    isActive: boolean;

    @IsOptional()
    role: string;
}
