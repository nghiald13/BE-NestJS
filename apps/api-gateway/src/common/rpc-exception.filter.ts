import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const status = exception?.status
            || exception?.statusCode
            || (typeof exception?.error === 'object' && exception?.error?.statusCode)
            || HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception?.response?.message
            || exception?.message
            || exception?.error?.message
            || 'Internal server error';

        response.status(status).json({
            statusCode: status,
            message: message,
            error: exception?.name || 'Error',
            timestamp: new Date().toISOString(),
        });
    }
}