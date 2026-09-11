export enum PaymentMethod {
    ZALOPAY = 'ZALOPAY',
    MOMO = 'MOMO',
    COD = 'COD'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    FINALIZING = 'FINALIZING',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
    FAILED = 'FAILED'
}

export enum PaymentAttemptStatus {
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
}