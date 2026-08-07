import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class ItemsDto {
    @IsNotEmpty()
    @IsString()
    _id: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    price: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    quantity: number;

    @IsOptional()
    manufacturer: string;

    @IsOptional()
    @IsNumber()
    in_stock: number;
}

export class CreatePaymentDto {

    @IsNotEmpty()
    @IsObject()
    userInfo: {
        _id: string,
        email: string
    }

    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemsDto)
    items: ItemsDto[]

    @IsObject()
    @IsNotEmpty()
    billing: {
        totalPrice: number
        taxAmount: number
    }
}
