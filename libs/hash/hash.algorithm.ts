import * as crypto from 'crypto';

export const hmacsha256 = (data: string, secretKey: string): string => {
    return crypto
        .createHmac('sha256', secretKey)
        .update(data)
        .digest('hex');
}