export enum PaymentMethod {
    ZALOPAY = 'ZALOPAY',
    // MOMO = 'MOMO',
    COD = 'COD'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    FINALIZING = 'FINALIZING',
    PAID = 'PAID',
    REQUESTED_CANCEL = 'REQUESTED_CANCEL',
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
    REFUNDED = 'REFUNDED',
    CANCELLED = 'CANCELLED',
    FAILED = 'FAILED'
}

export enum PaymentAttemptStatus {
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
}

export enum RefundAttemptStatus {
    REQUESTED_REFUND = 'REQUESTED_REFUND',
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
}