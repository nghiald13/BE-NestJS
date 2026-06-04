import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class UpdatePaymentDto {

}

export class MomoPaymentDto {
    @IsNotEmpty()
    partnerCode: string;

    @IsNotEmpty()
    orderId: string;

    @IsNotEmpty()
    requestId: string;

    @IsNotEmpty()
    amount: string | number;

    @IsNotEmpty()
    orderInfo: string;

    @IsNotEmpty()
    orderType: string;

    @IsNotEmpty()
    transId: string | number;

    @IsNotEmpty()
    resultCode: string | number;

    @IsNotEmpty()
    message: string;

    @IsOptional() // Khi hủy thanh toán, MoMo trả về rỗng
    payType: string;

    @IsNotEmpty()
    responseTime: string | number;

    @IsOptional()
    extraData: string;

    @IsNotEmpty()
    signature: string;
}
