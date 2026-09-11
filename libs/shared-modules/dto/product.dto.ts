import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsArray, ValidateNested, IsObject, ArrayMinSize } from "class-validator";

class SpecificationItemDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsString()
    @IsNotEmpty()
    value: string;
}

class BulkProductItemDto {
    @IsNotEmpty({ message: "Tên sản phẩm không được để trống" })
    @IsString({ message: "Tên sản phẩm phải là chuỗi" })
    name: string;

    @IsNotEmpty({ message: "Giá sản phẩm không được để trống" })
    @IsNumber({}, { message: "Giá sản phẩm phải là chữ số" })
    @Min(0, { message: "Giá sản phẩm không được nhỏ hơn 0" })
    @Type(() => Number) // Tự động convert string "123" thành number 123 nếu có
    price: number;

    @IsNotEmpty({ message: "Số lượng tồn kho không được để trống" })
    @IsNumber({}, { message: "Tồn kho phải là chữ số" })
    @Min(0)
    @Type(() => Number)
    in_stock: number;

    @IsNotEmpty()
    @IsString()
    manufacturer: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SpecificationItemDto)
    specification?: SpecificationItemDto[];

    // Dành cho JSON Object từ Tiptap Rich Text Editor
    @IsNotEmpty({ message: "Mô tả sản phẩm không được để trống" })
    @IsObject({ message: "Mô tả phải là một JSON Object hợp lệ" })
    description: Record<string, any>;
}

export class BulkProductDto {
    @IsArray({ message: "Danh sách sản phẩm phải là một mảng" })
    @ArrayMinSize(1, { message: "Danh sách sản phẩm phải có ít nhất 1 mặt hàng" })
    @ValidateNested({ each: true }) // Bắt buộc NestJS validate từng phần tử bên trong mảng
    @Type(() => BulkProductItemDto)     // Chuyển đổi Plain Object thành Instance của BulkProductDto
    items: BulkProductItemDto[];
}

