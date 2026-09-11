import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEmail, IsMongoId, IsNotEmpty, IsNumber, IsNumberString, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class CustomerInfoDto {
    @ApiProperty({ example: 'Nguyễn Văn A' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: 'nguyenvana@email.com', description: 'Must be in email format' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123 Đường A, Phường B, Tỉnh/Thành phố C' })
    @IsNotEmpty()
    @IsString()
    address: string;

    @ApiProperty({ example: '0987654321', description: 'Must be number string' })
    @IsNotEmpty()
    @IsNumberString()
    phone: string;
}

class ItemDto {
    @ApiProperty({ example: '6a71947a199709657062cccf', description: 'MongoDB ObjectId' })
    @IsNotEmpty()
    @IsString()
    productId: string;

    @ApiProperty({ example: 4, minimum: 1, description: 'Must be greater than or equal 1' })
    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CreatePaymentDto {

    @ApiProperty({ example: '6a01a103aac7ea062cd71474', description: 'MongoDB ObjectId' })
    @IsMongoId()
    @IsNotEmpty()
    userId: string;

    @ApiProperty()
    @ValidateNested()
    @Type(() => CustomerInfoDto)
    customerInfo: CustomerInfoDto;

    @ApiProperty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemDto)
    items: ItemDto[]
}
