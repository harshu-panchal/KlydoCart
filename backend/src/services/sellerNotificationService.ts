import { Server as SocketIOServer } from 'socket.io';
import OrderItem from '../models/OrderItem';
import Order from '../models/Order';
import Seller from '../models/Seller';
import mongoose from 'mongoose';
import { sendPushNotification } from './firebaseAdmin';

/**
 * "Ring" effect for closed tabs: browsers only play the OS default sound once per
 * push (custom looping audio is impossible without an open tab), so for new orders
 * we re-send the push a few times until the order is accepted/handled or the seller
 * opens the site. Each repeat replays the system notification sound.
 * Tune via env: SELLER_PUSH_REPEAT_COUNT / SELLER_PUSH_REPEAT_INTERVAL_SECONDS.
 */
const SELLER_PUSH_REPEAT_COUNT = Number(process.env.SELLER_PUSH_REPEAT_COUNT) || 1;
const SELLER_PUSH_REPEAT_INTERVAL_MS =
    (Number(process.env.SELLER_PUSH_REPEAT_INTERVAL_SECONDS) || 20) * 1000;

// Orders that currently have a repeat "ring" cycle running (prevents duplicates)
const activeSellerPushRepeats = new Set<string>();

/**
 * Notify all sellers involved in an order about a new order or status change
 */
export async function notifySellersOfOrderUpdate(
    io: SocketIOServer,
    order: any,
    type: 'NEW_ORDER' | 'STATUS_UPDATE' | 'ORDER_CANCELLED'
): Promise<void> {
    try {
        if (!io) {
            console.error('Socket.io server not provided to notifySellersOfOrderUpdate');
            return;
        }

        // Get all unique seller IDs from order items
        // If items are populated, we can get them directly, otherwise we need to query
        let orderItems = order.items;

        // If items are just IDs or don't have seller info (common with lean objects), fetch the full OrderItem details
        const isIdOnly = orderItems.length > 0 && (
            typeof orderItems[0] === 'string' || 
            orderItems[0] instanceof mongoose.Types.ObjectId ||
            !orderItems[0].seller
        );

        if (isIdOnly) {
            orderItems = await OrderItem.find({ order: order._id });
        }

        const sellerIds = [...new Set(orderItems.map((item: any) => item.seller.toString()))];

        console.log(`🔔 Notifying ${sellerIds.length} sellers about ${type} for order ${order.orderNumber}`);

        for (const sellerId of sellerIds) {
            // Get only items belonging to this seller
            const sellerSpecificItems = orderItems.filter((item: any) => item.seller.toString() === sellerId);

            const notificationData = {
                type,
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                customer: {
                    name: order.customerName,
                    email: order.customerEmail,
                    phone: order.customerPhone,
                    address: order.deliveryAddress
                },
                items: sellerSpecificItems.map((item: any) => ({
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    total: item.total,
                    variation: item.variation
                })),
                totalAmount: sellerSpecificItems.reduce((acc: number, item: any) => acc + item.total, 0),
                timestamp: new Date()
            };

            // Emit to seller-specific room
            io.to(`seller-${sellerId}`).emit('seller-notification', notificationData);
            console.log(`📤 Emitted notification to seller-${sellerId}`);
        }

        // --- FCM PUSH NOTIFICATIONS (reach sellers even when the tab/browser is closed) ---
        await sendSellerPushNotifications(io, sellerIds as string[], order, type);
    } catch (error) {
        console.error('Error in notifySellersOfOrderUpdate:', error);
    }
}

/**
 * Send FCM push notifications to sellers so they are alerted about orders
 * even when the website tab is closed. Clicking the notification opens the
 * seller orders page (handled via webpush fcmOptions.link / SW click handler).
 */
async function sendSellerPushNotifications(
    io: SocketIOServer,
    sellerIds: string[],
    order: any,
    type: 'NEW_ORDER' | 'STATUS_UPDATE' | 'ORDER_CANCELLED'
): Promise<void> {
    // Only push for events a seller must act on / know about immediately.
    // Routine status updates stay socket-only to avoid notification spam.
    if (type !== 'NEW_ORDER' && type !== 'ORDER_CANCELLED') return;

    try {
        const sellers = await Seller.find({
            _id: { $in: sellerIds },
            $or: [
                { fcmTokens: { $exists: true, $ne: [] } },
                { fcmTokenMobile: { $exists: true, $ne: [] } }
            ]
        }).select('fcmTokens fcmTokenMobile storeName');

        if (sellers.length === 0) {
            console.log('ℹ️ No sellers with FCM tokens to push-notify');
            return;
        }

        // Keep tokens grouped per seller so repeat "rings" can skip sellers
        // who have since opened the site (their tab plays the mp3 ring itself).
        const sellerTokenMap = new Map<string, string[]>();
        sellers.forEach(s => {
            const tokens = [...(s.fcmTokens || []), ...(s.fcmTokenMobile || [])];
            if (tokens.length > 0) sellerTokenMap.set((s._id as mongoose.Types.ObjectId).toString(), tokens);
        });

        const allTokens = [...new Set([...sellerTokenMap.values()].flat())];
        if (allTokens.length === 0) return;

        const orderIdStr = order._id.toString();
        const isAutoAccepted = type === 'NEW_ORDER' && order.status === 'Accepted';
        const title = type === 'NEW_ORDER'
            ? (isAutoAccepted ? '✅ New Order (Auto-Accepted)!' : '🛒 New Order Received!')
            : '❌ Order Cancelled';
        const body = type === 'NEW_ORDER'
            ? `Order #${order.orderNumber} for ₹${order.total}${isAutoAccepted ? ' was auto-accepted. Delivery partners have been notified.' : '. Tap to view and accept.'}`
            : `Order #${order.orderNumber} has been cancelled by the customer.`;

        const payload = {
            title,
            body,
            data: {
                type,
                orderId: orderIdStr,
                orderNumber: order.orderNumber?.toString() || '',
                link: `/seller/orders/${orderIdStr}`,
                // Open tabs play this ringtone when the push arrives (SW sound bridge)
                sound: 'seller_alert'
            },
            // Same tag on every send: repeats replace the previous notification and
            // replay the system sound instead of stacking up in the tray.
            webTag: `seller-order-${orderIdStr}`
        };

        await sendPushNotification(allTokens, payload);
        console.log(`📱 Sent seller FCM push (${type}) to ${allTokens.length} tokens across ${sellers.length} sellers`);

        // New orders that still need seller action get the repeated "ring" treatment
        if (type === 'NEW_ORDER' && !isAutoAccepted) {
            scheduleSellerPushRepeats(io, orderIdStr, sellerTokenMap, payload);
        }
    } catch (fcmError) {
        console.error('⚠️ Error sending seller FCM push notifications:', fcmError);
        // Non-blocking — socket notification already went out
    }
}

/**
 * Re-send the new-order push every few seconds so a closed tab keeps "ringing"
 * (each send replays the OS notification sound). Stops as soon as:
 *  - the order is no longer waiting for the seller (accepted/rejected/cancelled), or
 *  - the max repeat count is reached.
 * Sellers whose tab is open (socket room active) are skipped — their open tab
 * already plays the looping alert sound.
 */
function scheduleSellerPushRepeats(
    io: SocketIOServer,
    orderId: string,
    sellerTokenMap: Map<string, string[]>,
    payload: { title: string; body: string; data: { [key: string]: string }; webTag: string }
): void {
    if (SELLER_PUSH_REPEAT_COUNT <= 0) return;
    if (activeSellerPushRepeats.has(orderId)) return;
    activeSellerPushRepeats.add(orderId);

    let attempt = 0;

    const stop = () => activeSellerPushRepeats.delete(orderId);

    const tick = async () => {
        try {
            attempt++;

            // Stop ringing once the order no longer needs the seller's attention
            const current = await Order.findById(orderId).select('status');
            if (!current || current.status !== 'Received') {
                stop();
                return;
            }

            // Only re-ring sellers who still don't have the site open
            const tokens: string[] = [];
            for (const [sellerId, sellerTokens] of sellerTokenMap) {
                const room = io.sockets.adapter.rooms.get(`seller-${sellerId}`);
                if (!room || room.size === 0) {
                    tokens.push(...sellerTokens);
                }
            }

            if (tokens.length > 0) {
                await sendPushNotification([...new Set(tokens)], {
                    ...payload,
                    title: `🔔 ${payload.title}`,
                    body: `${payload.body}${SELLER_PUSH_REPEAT_COUNT > 1 ? ` (Reminder ${attempt}/${SELLER_PUSH_REPEAT_COUNT})` : ' (Reminder)'}`,
                    // Unique tag per reminder: Windows doesn't reliably replay the sound
                    // when a toast is replaced in-place (renotify), but a fresh toast
                    // always gets a fresh sound.
                    webTag: `${payload.webTag}-r${attempt}`
                });
                console.log(`🔁 Seller push ring ${attempt}/${SELLER_PUSH_REPEAT_COUNT} for order ${orderId} (${tokens.length} tokens)`);
            }

            if (attempt < SELLER_PUSH_REPEAT_COUNT) {
                setTimeout(tick, SELLER_PUSH_REPEAT_INTERVAL_MS);
            } else {
                stop();
            }
        } catch (err) {
            console.error(`Error in seller push repeat for order ${orderId}:`, err);
            stop();
        }
    };

    setTimeout(tick, SELLER_PUSH_REPEAT_INTERVAL_MS);
}
