import { Socket } from 'socket.io-client';

export interface OrderNotificationData {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: {
        address: string;
        city: string;
        state?: string;
        pincode: string;
        landmark?: string;
    };
    total: number;
    subtotal: number;
    shipping: number;
    createdAt: string;
    isReturn?: false;
}

export interface ReturnNotificationData {
    isReturn: true;
    returnId: string;
    orderId: string;
    reason: string;
    quantity: number;
    storeName: string;
    pickupAddress: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    createdAt: string;
}

export type DeliveryNotificationData = OrderNotificationData | ReturnNotificationData;

export interface AcceptOrderResponse {
    success: boolean;
    message: string;
}

export interface RejectOrderResponse {
    success: boolean;
    message: string;
    allRejected: boolean;
}

/**
 * Accept an order via WebSocket
 */
export const acceptOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<AcceptOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.error(`❌ acceptOrder timeout after 30 seconds for order ${orderId}`);
            resolve({
                success: false,
                message: 'Request timeout',
            });
        }, 30000); // 30 second timeout

        console.log(`📤 Sending accept-order for order ${orderId} by delivery boy ${deliveryBoyId}`);
        socket.emit('accept-order', { orderId, deliveryBoyId });

        socket.once('accept-order-response', (response: AcceptOrderResponse) => {
            console.log(`📥 Received accept-order-response:`, response);
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Reject an order via WebSocket
 */
export const rejectOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<RejectOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.error(`❌ rejectOrder timeout after 30 seconds for order ${orderId}`);
            resolve({
                success: false,
                message: 'Request timeout',
                allRejected: false,
            });
        }, 30000); // 30 second timeout

        console.log(`📤 Sending reject-order for order ${orderId} by delivery boy ${deliveryBoyId}`);
        socket.emit('reject-order', { orderId, deliveryBoyId });

        socket.once('reject-order-response', (response: RejectOrderResponse) => {
            console.log(`📥 Received reject-order-response:`, response);
            clearTimeout(timeout);
            resolve(response);
        });
    });
};
