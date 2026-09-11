
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        // Case 1: lỗi ném trực tiếp tại api-gateway (HttpException bình thường,
        // VD: guard reject, validation pipe fail)
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            return response.status(status).json(exception.getResponse());
        }

        // Case 2: lỗi từ RpcException có cấu trúc { statusCode, message }
        // ném từ auth-service / products-service / orders-service / payment-service
        if (exception && typeof exception === 'object' && 'statusCode' in exception) {
            return response.status(exception.statusCode).json({
                statusCode: exception.statusCode,
                message: exception.message,
            });
        }

        // Case 3: timeout khi microservice không phản hồi kịp
        if (exception?.name === 'TimeoutError') {
            return response.status(HttpStatus.GATEWAY_TIMEOUT).json({
                statusCode: HttpStatus.GATEWAY_TIMEOUT,
                message: 'Service không phản hồi kịp thời, vui lòng thử lại',
            });
        }

        // Case 4: RpcException chỉ truyền string thuần, hoặc lỗi lạ
        // (VD: ECONNREFUSED khi service down hẳn)
        const message =
            typeof exception === 'string'
                ? exception
                : exception?.message || 'Lỗi hệ thống, vui lòng thử lại sau';

        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message,
        });
    }
}