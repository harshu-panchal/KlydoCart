import { Server as SocketIOServer } from 'socket.io';
import Delivery from '../models/Delivery';
import Order from '../models/Order';
import Seller from '../models/Seller';
import Return from '../models/Return';
import mongoose from 'mongoose';
import { notifySellersOfOrderUpdate } from './sellerNotificationService';
import { sendPushNotification } from './firebaseAdmin';

// Track order notification state
export interface OrderNotificationState {
    orderId: string;
    notifiedDeliveryBoys: Set<string>;
    rejectedDeliveryBoys: Set<string>;
    acceptedBy: string | null;
}

export const notificationStates = new Map<string, OrderNotificationState>();

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export async function isDeliveryBoyBusy(_deliveryBoyId: string | mongoose.Types.ObjectId): Promise<boolean> {
    // Disabled busy check to ensure delivery boys always receive notifications and can handle queued/multiple orders
    return false;
}

/**
 * Find all available delivery boys (online and active)
 */
export async function findAvailableDeliveryBoys(): Promise<mongoose.Types.ObjectId[]> {
    try {
        // Only select delivery boys who are online AND active (approved by admin)
        const deliveryBoys = await Delivery.find({
            isOnline: true,
            status: 'Active',
        }).select('_id');

        console.log(`📋 Found ${deliveryBoys.length} online delivery boys (all statuses)`);
        return deliveryBoys.map(db => db._id);
    } catch (error) {
        console.error('Error finding available delivery boys:', error);
        return [];
    }
}

/**
 * Find delivery boys near a specific location within a radius
 * Uses the delivery boy's location from the Delivery model (preferred)
 * or falls back to DeliveryTracking
 */
export async function findDeliveryBoysNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
): Promise<{ deliveryBoyId: mongoose.Types.ObjectId; distance: number }[]> {
    const nearbyDeliveryBoys: { deliveryBoyId: mongoose.Types.ObjectId; distance: number }[] = [];

    try {
        try {
            // Only select delivery boys who are online AND active (approved by admin)
            const deliveryBoysWithLocation = await Delivery.find({
                isOnline: true,
                status: 'Active',
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [longitude, latitude]
                        },
                        $maxDistance: radiusKm * 1000 // Convert km to meters
                    }
                }
            }).select('_id location');

            if (deliveryBoysWithLocation.length > 0) {
                for (const db of deliveryBoysWithLocation) {
                    if (db.location && db.location.coordinates) {
                        const [dbLng, dbLat] = db.location.coordinates;
                        const distance = calculateDistance(latitude, longitude, dbLat, dbLng);
                        nearbyDeliveryBoys.push({
                            deliveryBoyId: db._id as mongoose.Types.ObjectId,
                            distance
                        });
                    }
                }
                console.log(`📍 Found ${nearbyDeliveryBoys.length} delivery boys using live location within ${radiusKm}km`);
            }
        } catch (geoError) {
            console.error('⚠️ Warning: GeoNear query failed (likely missing 2dsphere index). Proceeding to fallback.', geoError);
        }

        // 2. ALSO include online delivery boys who might NOT have the location field set yet (Fallback/Inclusive)
        // This ensures new or untracked online delivery boys still get notifications
        const trackedIds = new Set(nearbyDeliveryBoys.map(db => db.deliveryBoyId.toString()));
        
        try {
            const otherOnlineBoys = await Delivery.find({
                isOnline: true,
                status: 'Active',
                _id: { $nin: Array.from(trackedIds).map(id => new mongoose.Types.ObjectId(id)) }
            }).select('_id');

            if (otherOnlineBoys.length > 0) {
                console.log(`ℹ️ Including ${otherOnlineBoys.length} additional online delivery boys without recent location data`);
                for (const db of otherOnlineBoys) {
                    nearbyDeliveryBoys.push({
                        deliveryBoyId: db._id as mongoose.Types.ObjectId,
                        distance: radiusKm / 2, // Default distance (middle of radius)
                    });
                }
            }
        } catch (fallbackError) {
            console.error('❌ Fallback query failed:', fallbackError);
        }

        if (nearbyDeliveryBoys.length > 0) {
            return nearbyDeliveryBoys.sort((a, b) => a.distance - b.distance);
        }

        return [];
    } catch (error) {
        console.error('Error finding nearby delivery boys:', error);
        return [];
    }
}

/**
 * Find delivery boys near seller locations for an order
 * Aggregates all unique sellers from order items and finds delivery boys within their service radius
 */
export async function findDeliveryBoysNearSellerLocations(
    order: any
): Promise<mongoose.Types.ObjectId[]> {
    try {
        // Get unique seller IDs from order items
        const sellerIds = [...new Set(
            order.items
                ?.map((item: any) => {
                    const s = item.seller;
                    if (!s) return null;
                    return typeof s === 'object' ? s._id?.toString() : s.toString();
                })
                .filter((id: string | null) => id) || []
        )];
        console.log(`🔍 [Notification] Unique seller IDs for order:`, sellerIds);

        if (sellerIds.length === 0) {
            console.log('No sellers found in order, falling back to all available delivery boys');
            return findAvailableDeliveryBoys();
        }

        // Get seller locations
        const sellers = await Seller.find({
            _id: { $in: sellerIds },
        }).select('latitude longitude location serviceRadiusKm storeName');

        if (sellers.length === 0) {
            console.log('No seller data found, falling back to all available delivery boys');
            return findAvailableDeliveryBoys();
        }
        console.log(`🔍 [Notification] Found ${sellers.length} sellers with location data`);

        // Find delivery boys near each seller location
        const nearbyDeliveryBoyMap = new Map<string, { distance: number }>();

        for (const seller of sellers) {
            let lat: number | null = null;
            let lng: number | null = null;

            // Prioritize GeoJSON location field
            if (seller.location && seller.location.coordinates) {
                lng = seller.location.coordinates[0];
                lat = seller.location.coordinates[1];
            } else {
                // Fallback to legacy fields
                lat = seller.latitude ? parseFloat(seller.latitude) : null;
                lng = seller.longitude ? parseFloat(seller.longitude) : null;
            }

            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                console.log(`Seller ${seller.storeName} has no valid location, skipping`);
                continue;
            }

            const radius = seller.serviceRadiusKm || 10; // Default 10km
            const nearbyBoys = await findDeliveryBoysNearLocation(lat, lng, radius);

            for (const boy of nearbyBoys) {
                const boyId = boy.deliveryBoyId.toString();
                // Keep the smallest distance if same delivery boy is near multiple sellers
                if (!nearbyDeliveryBoyMap.has(boyId) || nearbyDeliveryBoyMap.get(boyId)!.distance > boy.distance) {
                    nearbyDeliveryBoyMap.set(boyId, { distance: boy.distance });
                }
            }
        }

        if (nearbyDeliveryBoyMap.size === 0) {
            console.log('No delivery boys found near seller locations, falling back to all available');
            return findAvailableDeliveryBoys();
        }

        // Sort by distance and return IDs
        const sortedBoys = Array.from(nearbyDeliveryBoyMap.entries())
            .sort((a, b) => a[1].distance - b[1].distance)
            .map(([id]) => new mongoose.Types.ObjectId(id));

        console.log(`📍 Found ${sortedBoys.length} delivery boys near seller locations`);
        return sortedBoys;
    } catch (error) {
        console.error('Error finding delivery boys near seller locations:', error);
        return findAvailableDeliveryBoys();
    }
}

/**
 * Emit new order notification to delivery boys near seller locations
 * Prioritizes delivery boys within the seller's service radius
 */
export async function notifyDeliveryBoysOfNewOrder(
    io: SocketIOServer,
    order: any
): Promise<void> {
    try {
        console.log(`🔔 Starting notification process for order ${order.orderNumber || order._id}`);
        
        // Find delivery boys near seller locations (within service radius)
        let nearbyDeliveryBoyIds = await findDeliveryBoysNearSellerLocations(order);

        if (nearbyDeliveryBoyIds.length === 0) {
            console.log('❌ No available delivery boys to notify (including fallback)');
            return;
        }

        console.log(`✅ Found ${nearbyDeliveryBoyIds.length} available delivery boys:`, nearbyDeliveryBoyIds.map(id => id.toString()));

        // --- FILTER BUSY DELIVERY BOYS (Bypassed) ---
        console.log(`ℹ️ Busy filtering bypassed. Available: ${nearbyDeliveryBoyIds.length}`);

        // Prepare order data for notification
        const orderData = {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            deliveryAddress: {
                address: order.deliveryAddress.address,
                city: order.deliveryAddress.city,
                state: order.deliveryAddress.state,
                pincode: order.deliveryAddress.pincode,
            },
            total: order.total,
            subtotal: order.subtotal,
            shipping: order.shipping,
            createdAt: order.createdAt,
        };

        // Initialize notification state
        const orderId = order._id.toString();
        const notifiedIds = new Set<string>();
        const disconnectedIds: string[] = [];

        // Notify all eligible delivery boys via their individual rooms
        for (const id of nearbyDeliveryBoyIds) {
            const idString = id.toString().trim();
            const roomName = `delivery-${idString}`;
            
            // Always emit - Socket.io will handle sending to active sockets in the room
            io.to(roomName).emit('new-order', orderData);
            notifiedIds.add(idString);

            const room = io.sockets.adapter.rooms.get(roomName);
            if (room && room.size > 0) {
                console.log(`📤 [SUCCESS] Emitted new-order to connected delivery boy room: ${roomName}. Room size: ${room.size}`);
            } else {
                disconnectedIds.push(idString);
                console.log(`📤 Emitted new-order to room: ${roomName} (offline/disconnected at the moment)`);
            }
        }

        // Store ALL eligible delivery boys in state (connected + disconnected)
        // so when a disconnected delivery boy connects, they can still receive the order
        const allEligibleIds = new Set<string>(nearbyDeliveryBoyIds.map(id => id.toString().trim()));

        notificationStates.set(orderId, {
            orderId,
            notifiedDeliveryBoys: allEligibleIds,
            rejectedDeliveryBoys: new Set(),
            acceptedBy: null,
        });

        // Only notify individual active delivery boys, not the general room
        // This prevents offline delivery boys from receiving notifications

        // --- FCM PUSH NOTIFICATIONS ---
        try {
            // Fetch FCM tokens for all eligible nearby delivery boys (including disconnected ones)
            const deliveryBoysWithTokens = await Delivery.find({
                _id: { $in: nearbyDeliveryBoyIds },
                $or: [
                    { fcmTokens: { $exists: true, $ne: [] } },
                    { fcmTokenMobile: { $exists: true, $ne: [] } }
                ]
            }).select('fcmTokens fcmTokenMobile name');

            if (deliveryBoysWithTokens.length > 0) {
                const allTokens: string[] = [];
                deliveryBoysWithTokens.forEach(db => {
                    if (db.fcmTokens) allTokens.push(...db.fcmTokens);
                    if (db.fcmTokenMobile) allTokens.push(...db.fcmTokenMobile);
                });

                if (allTokens.length > 0) {
                    const uniqueTokens = [...new Set(allTokens)];
                    await sendPushNotification(uniqueTokens, {
                        title: '🎁 New Order Available!',
                        body: `New order #${order.orderNumber} for ₹${order.total}. Tap to view details and accept.`,
                        data: {
                            type: 'NEW_ORDER',
                            orderId: orderId,
                            orderNumber: order.orderNumber?.toString() || '',
                            total: order.total?.toString() || ''
                        }
                    });
                    console.log(`📱 Sent FCM push notifications to ${uniqueTokens.length} unique tokens for ${deliveryBoysWithTokens.length} delivery boys`);
                }
            }
        } catch (fcmError) {
            console.error('⚠️ Error sending FCM notifications during order flow:', fcmError);
            // Don't throw, we still want to continue since socket might have worked
        }
        // ---------------------------------

        console.log(`📢 Successfully notified ${notifiedIds.size} connected delivery boys about order ${order.orderNumber}`);
        if (disconnectedIds.length > 0) {
            console.log(`⚠️ ${disconnectedIds.length} delivery boys were not notified via Socket (offline), but were notified via FCM if tokens available.`);
        }
    } catch (error) {
        console.error('❌ Error notifying delivery boys:', error);
    }
}

/**
 * Handle order acceptance by a delivery boy
 */
export async function handleOrderAcceptance(
    io: SocketIOServer,
    orderId: string,
    deliveryBoyId: string
): Promise<{ success: boolean; message: string }> {
    try {
        const state = notificationStates.get(orderId);
        const normalizedDeliveryBoyId = String(deliveryBoyId).trim();

        // Check if delivery boy is already busy with another order or return request
        const isBusy = await isDeliveryBoyBusy(normalizedDeliveryBoyId);
        if (isBusy) {
            return { success: false, message: 'You are currently busy with another order or return request' };
        }

        // 1. In-Memory Check (Preferred)
        if (state) {
            // Check if already accepted in memory
            if (state.acceptedBy) {
                return { success: false, message: 'Order already accepted by another delivery boy' };
            }

            // Check if this delivery boy was notified
            if (!state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId)) {
                console.warn(`⚠️ Delivery boy ${normalizedDeliveryBoyId} not in notified list for acceptance of order ${orderId}. Notified:`, Array.from(state.notifiedDeliveryBoys));
                return { success: false, message: 'You were not notified about this order' };
            }

            // Check if this delivery boy already rejected
            if (state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId)) {
                return { success: false, message: 'You have already rejected this order' };
            }

            // Mark as accepted in memory
            state.acceptedBy = normalizedDeliveryBoyId;
        } else {
            console.log(`⚠️ Notification state missing for order ${orderId}. Checking database for fallback...`);
            // 2. Database Fallback (For server restarts/stale notifications)
            // We skip "notified" and "rejected" checks because that data is lost.
            // We assume if they have the ID, they were notified effectively.
        }

        // Update order in database
        const order = await Order.findById(orderId);
        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        // Check if order already has a delivery boy assigned
        if (order.deliveryBoy) {
            return { success: false, message: 'Order already assigned to another delivery boy' };
        }

        // Assign order to delivery boy
        order.deliveryBoy = new mongoose.Types.ObjectId(normalizedDeliveryBoyId);
        order.deliveryBoyStatus = 'Assigned';
        order.assignedAt = new Date();
        order.status = 'Processed'; // Mark as processed when assigned

        await order.save();

        // Emit order-accepted event to all delivery boys who were notified
        // (Only to individual rooms, not general room)
        if (state) {
            for (const notifiedId of state.notifiedDeliveryBoys) {
                const notifiedIdString = String(notifiedId).trim();
                io.to(`delivery-${notifiedIdString}`).emit('order-accepted', {
                    orderId,
                    acceptedBy: normalizedDeliveryBoyId,
                });
            }
            // Clean up notification state
            notificationStates.delete(orderId);
        } else {
            // If no state, emit to the accepting delivery boy
            io.to(`delivery-${normalizedDeliveryBoyId}`).emit('order-accepted', {
                orderId,
                acceptedBy: normalizedDeliveryBoyId,
            });
        }

        // Emit delivery-boy-accepted event to customer for tracking
        io.to(`order-${orderId}`).emit('delivery-boy-accepted', {
            orderId,
            deliveryBoyId: normalizedDeliveryBoyId,
            message: 'Delivery boy accepted your order. Tracking started.',
        });

        console.log(`✅ Order ${orderId} accepted by delivery boy ${normalizedDeliveryBoyId} ${state ? '(Memory)' : '(DB Fallback)'}`);
        return { success: true, message: 'Order accepted successfully' };
    } catch (error) {
        console.error('Error handling order acceptance:', error);
        return { success: false, message: 'Error accepting order' };
    }
}

/**
 * Handle order rejection by a delivery boy
 */
export async function handleOrderRejection(
    io: SocketIOServer,
    orderId: string,
    deliveryBoyId: string
): Promise<{ success: boolean; message: string; allRejected: boolean }> {
    try {
        const state = notificationStates.get(orderId);

        if (!state) {
            return { success: false, message: 'Order notification not found', allRejected: false };
        }

        // Check if already accepted
        if (state.acceptedBy) {
            return { success: false, message: 'Order already accepted', allRejected: false };
        }

        // Check if this delivery boy was notified
        const normalizedDeliveryBoyId = String(deliveryBoyId).trim();
        if (!state.notifiedDeliveryBoys.has(normalizedDeliveryBoyId)) {
            console.warn(`⚠️ Delivery boy ${normalizedDeliveryBoyId} not in notified list for order ${orderId}. Notified:`, Array.from(state.notifiedDeliveryBoys));
            return { success: false, message: 'You were not notified about this order', allRejected: false };
        }

        // Check if already rejected
        if (state.rejectedDeliveryBoys.has(normalizedDeliveryBoyId)) {
            return { success: true, message: 'You have already rejected this order', allRejected: false };
        }

        // Mark as rejected
        state.rejectedDeliveryBoys.add(normalizedDeliveryBoyId);

        // Check if all delivery boys have rejected
        const allRejected = state.rejectedDeliveryBoys.size === state.notifiedDeliveryBoys.size;

        if (allRejected) {
            // Update order in database to "Rejected"
            try {
                // Update order in database to "Rejected"
                const order = await Order.findById(orderId);
                if (order) {
                    order.status = 'Rejected';
                    order.deliveryBoyStatus = 'Failed';
                    order.adminNotes = (order.adminNotes ? order.adminNotes + '\n' : '') +
                        `[${new Date().toISOString()}] Rejected: All notified delivery boys (${state.notifiedDeliveryBoys.size}) rejected the order.`;
                    await order.save();

                    // Notify customer via socket
                    io.to(`order-${orderId}`).emit('order-rejected', {
                        orderId,
                        message: 'Unfortunately, no delivery partner is available at the moment. Your order has been rejected.',
                    });

                    // Notify sellers/restaurants
                    notifySellersOfOrderUpdate(io, order, 'STATUS_UPDATE');

                    console.log(`✅ All delivery boys rejected order ${orderId}. Order status updated to Rejected.`);
                } else {
                    console.error(`❌ Order ${orderId} not found when trying to update rejection status`);
                }
            } catch (dbError) {
                console.error(`❌ Error updating order ${orderId} to Rejected status:`, dbError);
                // We still proceed with cleanup to avoid memory leaks/stuck state
            }

            // Clean up notification state
            notificationStates.delete(orderId);
        } else {
            // Emit rejection acknowledgment to the specific delivery boy
            io.to(`delivery-${deliveryBoyId}`).emit('order-rejection-acknowledged', {
                orderId,
            });
        }

        console.log(`🚫 Delivery boy ${deliveryBoyId} rejected order ${orderId}`);
        return { success: true, message: 'Order rejected', allRejected };
    } catch (error) {
        console.error('Error handling order rejection:', error);
        return { success: false, message: 'Error rejecting order', allRejected: false };
    }
}

/**
 * Get notification state for an order
 */
export function getNotificationState(orderId: string): OrderNotificationState | undefined {
    return notificationStates.get(orderId);
}

/**
 * Scan all pending orders and notify a delivery boy if they are now eligible (e.g. just went online)
 */
export async function scanOrdersForDeliveryBoy(io: SocketIOServer, deliveryBoyId: string): Promise<void> {
    const normalizedId = String(deliveryBoyId).trim();
    
    // Check if delivery boy is already busy with another order or return request
    const isBusy = await isDeliveryBoyBusy(normalizedId);
    if (isBusy) {
        console.log(`ℹ️ Skipping scanOrdersForDeliveryBoy for ${normalizedId} as they are currently busy.`);
        return;
    }

    console.log(`🔍 Scanning pending orders for delivery boy ${normalizedId} who just went online/connected`);

    try {
        // Query database for all pending orders that don't have a delivery boy assigned yet
        const pendingOrders = await Order.find({
            status: { $in: ['Accepted', 'Processed'] },
            deliveryBoy: { $exists: false }
        });

        console.log(`🔍 Found ${pendingOrders.length} pending orders in database`);

        for (const orderRequest of pendingOrders) {
            const orderId = orderRequest._id.toString();

            // Initialize state in-memory if it was lost on server restart
            if (!notificationStates.has(orderId)) {
                notificationStates.set(orderId, {
                    orderId,
                    notifiedDeliveryBoys: new Set(),
                    rejectedDeliveryBoys: new Set(),
                    acceptedBy: null
                });
            }

            const state = notificationStates.get(orderId)!;

            if (state.acceptedBy) continue;
            if (state.rejectedDeliveryBoys.has(normalizedId)) continue;

            // Fetch full order to check eligibility
            const order = await Order.findById(orderId).populate({
                path: 'items',
                populate: { path: 'seller' }
            }).lean();

            const orderDataObj: any = order;
            if (!orderDataObj || !['Accepted', 'Processed'].includes(orderDataObj.status as string)) {
                continue;
            }

            // Check if they are eligible (either previously notified or currently near the seller)
            let isEligible = false;

            if (state.notifiedDeliveryBoys.has(normalizedId)) {
                isEligible = true;
            } else {
                try {
                    const nearbyBoys = await findDeliveryBoysNearSellerLocations(order);
                    isEligible = nearbyBoys.some(id => id.toString() === normalizedId);
                    if (isEligible) {
                        state.notifiedDeliveryBoys.add(normalizedId);
                    }
                } catch (err) {
                    console.error(`Error checking location for delivery boy ${normalizedId}:`, err);
                }
            }

            if (isEligible) {
                try {
                    console.log(`🎯 Delivery boy ${normalizedId} is eligible for order ${orderId}. Emitting notification.`);
                    
                    let pickupLocationText = 'Multiple Sellers';
                    if (orderDataObj.items && orderDataObj.items.length === 1 && orderDataObj.items[0].seller) {
                        const seller = orderDataObj.items[0].seller;
                        pickupLocationText = `${seller.storeName || 'Seller'}, ${seller.city || ''}`;
                    }

                    const orderData = {
                        orderId: orderDataObj._id.toString(),
                        orderNumber: orderDataObj.orderNumber,
                        customerName: orderDataObj.customerName,
                        customerPhone: orderDataObj.customerPhone,
                        deliveryAddress: {
                            address: orderDataObj.deliveryAddress?.address,
                            city: orderDataObj.deliveryAddress?.city,
                            state: orderDataObj.deliveryAddress?.state,
                            pincode: orderDataObj.deliveryAddress?.pincode,
                        },
                        total: orderDataObj.total,
                        subtotal: orderDataObj.subtotal,
                        shipping: orderDataObj.shipping,
                        pickupLocation: pickupLocationText,
                        createdAt: orderDataObj.createdAt,
                        timestamp: new Date()
                    };

                    io.to(`delivery-${normalizedId}`).emit('new-order', orderData);
                } catch (err) {
                    console.error(`Error emitting order ${orderId} for delivery boy ${normalizedId}:`, err);
                }
            } else {
                console.log(`⏩ Delivery boy ${normalizedId} is not eligible for order ${orderId}`);
            }
        }
    } catch (dbError) {
        console.error('Error scanning pending orders from database:', dbError);
    }
}

/**
 * Clean up notification state (for testing or manual cleanup)
 */
export function clearNotificationState(orderId: string): void {
    notificationStates.delete(orderId);
}

// Track return notification state
export interface ReturnNotificationState {
    returnId: string;
    notifiedDeliveryBoys: Set<string>;
    rejectedDeliveryBoys: Set<string>;
    acceptedBy: string | null;
}

export const returnNotificationStates = new Map<string, ReturnNotificationState>();

/**
 * Notify delivery boys of a new return pickup request
 */
export async function notifyDeliveryBoysOfNewReturn(io: SocketIOServer, returnRequest: any): Promise<void> {
    try {
        const returnId = returnRequest._id.toString();
        console.log(`🔄 Notifying delivery boys for new return request: ${returnId}`);

        // Fetch seller details to get the pickup location/radius
        const sellerId = returnRequest.seller?._id || returnRequest.seller;
        const seller = await Seller.findById(sellerId);
        if (!seller) {
            console.error(`❌ Seller not found for return ${returnId}`);
            return;
        }

        // Fetch customer/order details to enrich the payload
        const orderId = returnRequest.order?._id || returnRequest.order;
        const order = await Order.findById(orderId);
        if (!order) {
            console.error(`❌ Order not found for return ${returnId}`);
            return;
        }

        let lat: number | null = null;
        let lng: number | null = null;

        // Use customer delivery location as the primary search center for pickup
        if (order.deliveryAddress) {
            lat = order.deliveryAddress.latitude;
            lng = order.deliveryAddress.longitude;
        }

        // Fallback to seller location if customer location is missing
        if (!lat || !lng) {
            if (seller.location && seller.location.coordinates) {
                lng = seller.location.coordinates[0];
                lat = seller.location.coordinates[1];
            } else {
                lat = seller.latitude ? parseFloat(seller.latitude) : null;
                lng = seller.longitude ? parseFloat(seller.longitude) : null;
            }
        }

        if (!lat || !lng) {
            console.warn('⚠️ No valid coordinates found for return pickup, skipping notification.');
            return;
        }

        const radius = seller.serviceRadiusKm || 10;
        const nearbyBoys = await findDeliveryBoysNearLocation(lat, lng, radius);

        if (nearbyBoys.length === 0) {
            console.log('❌ No available delivery boys to notify for return');
            return;
        }

        let nearbyDeliveryBoyIds = nearbyBoys.map(b => b.deliveryBoyId);

        // --- FILTER BUSY DELIVERY BOYS FOR RETURN (Bypassed) ---
        console.log(`ℹ️ [Return] Busy filtering bypassed. Available: ${nearbyDeliveryBoyIds.length}`);

        const customerName = order.customerName || 'Customer';
        const customerPhone = order.customerPhone || '';
        const customerAddress = returnRequest.pickupAddress ? `${returnRequest.pickupAddress.address}, ${returnRequest.pickupAddress.city}` : '';

        const returnData = {
            returnId,
            orderId: orderId.toString(),
            reason: returnRequest.reason,
            quantity: returnRequest.quantity,
            storeName: seller.storeName,
            pickupAddress: seller.address,
            customerName,
            customerPhone,
            customerAddress
        };

        const notifiedIds = new Set<string>();
        const disconnectedIds: string[] = [];

        for (const id of nearbyDeliveryBoyIds) {
            const idString = id.toString().trim();
            const roomName = `delivery-${idString}`;
            
            // Always emit - Socket.io will handle sending to active sockets in the room
            io.to(roomName).emit('NEW_RETURN_PICKUP', returnData);
            notifiedIds.add(idString);

            const room = io.sockets.adapter.rooms.get(roomName);
            if (!room || room.size === 0) {
                disconnectedIds.push(idString);
            }
        }

        // Register ALL eligible delivery boy IDs in-memory, so if they go online slightly later, they can scan and get it!
        const allEligibleIds = new Set<string>(nearbyDeliveryBoyIds.map(id => id.toString().trim()));

        returnNotificationStates.set(returnId, {
            returnId,
            notifiedDeliveryBoys: allEligibleIds,
            rejectedDeliveryBoys: new Set(),
            acceptedBy: null,
        });

        // FCM push notifications
        try {
            const deliveryBoysWithTokens = await Delivery.find({
                _id: { $in: nearbyDeliveryBoyIds },
                $or: [
                    { fcmTokens: { $exists: true, $ne: [] } },
                    { fcmTokenMobile: { $exists: true, $ne: [] } }
                ]
            }).select('fcmTokens fcmTokenMobile name');

            if (deliveryBoysWithTokens.length > 0) {
                const allTokens: string[] = [];
                deliveryBoysWithTokens.forEach(db => {
                    if (db.fcmTokens) allTokens.push(...db.fcmTokens);
                    if (db.fcmTokenMobile) allTokens.push(...db.fcmTokenMobile);
                });

                if (allTokens.length > 0) {
                    const uniqueTokens = [...new Set(allTokens)];
                    await sendPushNotification(uniqueTokens, {
                        title: '🔄 New Return Pickup!',
                        body: `New return pickup available at ${seller.storeName}. Tap to accept.`,
                        data: {
                            type: 'NEW_RETURN_PICKUP',
                            returnId: returnId,
                        }
                    });
                }
            }
        } catch (fcmError) {
            console.error('Error sending FCM push notification for return:', fcmError);
        }
    } catch (error) {
        console.error('Error notifying delivery boys of return:', error);
    }
}

/**
 * Scan all pending returns and notify a delivery boy if they are now eligible
 */
export async function scanReturnsForDeliveryBoy(io: SocketIOServer, deliveryBoyId: string): Promise<void> {
    const normalizedId = String(deliveryBoyId).trim();
    
    // Check if delivery boy is already busy with another order or return request
    const isBusy = await isDeliveryBoyBusy(normalizedId);
    if (isBusy) {
        console.log(`ℹ️ Skipping scanReturnsForDeliveryBoy for ${normalizedId} as they are currently busy.`);
        return;
    }

    console.log(`🔍 Scanning pending returns for delivery boy ${normalizedId} who just went online/connected`);

    try {
        // Query database for all approved return requests that don't have a delivery boy assigned yet
        const pendingReturns = await Return.find({
            status: 'Approved',
            deliveryBoy: { $exists: false }
        });

        console.log(`🔍 Found ${pendingReturns.length} pending approved returns in database`);

        for (const returnRequest of pendingReturns) {
            const returnId = returnRequest._id.toString();

            // Initialize state in-memory if it was lost on server restart
            if (!returnNotificationStates.has(returnId)) {
                returnNotificationStates.set(returnId, {
                    returnId,
                    notifiedDeliveryBoys: new Set(),
                    rejectedDeliveryBoys: new Set(),
                    acceptedBy: null
                });
            }

            const state = returnNotificationStates.get(returnId)!;

            if (state.acceptedBy) continue;
            if (state.rejectedDeliveryBoys.has(normalizedId)) continue;

            let isEligible = false;

            if (state.notifiedDeliveryBoys.has(normalizedId)) {
                isEligible = true;
            } else {
                try {
                    const sellerId = returnRequest.seller?._id || returnRequest.seller;
                    const seller = await Seller.findById(sellerId).lean() as any;
                    if (!seller) continue;

                    const orderId = returnRequest.order?._id || returnRequest.order;
                    const order = await Order.findById(orderId).lean() as any;
                    if (!order) continue;

                    let lat: number | null = null;
                    let lng: number | null = null;

                    if (order.deliveryAddress) {
                        lat = order.deliveryAddress.latitude;
                        lng = order.deliveryAddress.longitude;
                    }

                    if (!lat || !lng) {
                        if (seller.location && seller.location.coordinates) {
                            lng = seller.location.coordinates[0];
                            lat = seller.location.coordinates[1];
                        } else {
                            lat = seller.latitude ? parseFloat(seller.latitude) : null;
                            lng = seller.longitude ? parseFloat(seller.longitude) : null;
                        }
                    }

                    if (lat && lng) {
                        const radius = seller.serviceRadiusKm || 10;
                        const nearbyBoys = await findDeliveryBoysNearLocation(lat, lng, radius);
                        isEligible = nearbyBoys.some(b => b.deliveryBoyId.toString() === normalizedId);
                    }
                    
                    if (isEligible) {
                        state.notifiedDeliveryBoys.add(normalizedId);
                    }
                } catch (err) {
                    console.error(`Error checking location for delivery boy ${normalizedId}:`, err);
                }
            }

            if (isEligible) {
                try {
                    console.log(`🎯 Delivery boy ${normalizedId} is eligible for return pickup ${returnId}. Emitting notification.`);
                    
                    const sellerId = returnRequest.seller?._id || returnRequest.seller;
                    const seller = await Seller.findById(sellerId).lean() as any;
                    const orderId = returnRequest.order?._id || returnRequest.order;

                    const returnData = {
                        returnId,
                        orderId: orderId.toString(),
                        reason: returnRequest.reason,
                        quantity: returnRequest.quantity,
                        storeName: seller?.storeName || 'Seller',
                        pickupAddress: seller?.address || '',
                        timestamp: new Date()
                    };

                    io.to(`delivery-${normalizedId}`).emit('new-return-pickup', returnData);
                } catch (err) {
                    console.error(`Error emitting return ${returnId} for delivery boy ${normalizedId}:`, err);
                }
            } else {
                console.log(`⏩ Delivery boy ${normalizedId} is not eligible for return ${returnId}`);
            }
        }
    } catch (error) {
        console.error('Error scanning pending returns:', error);
    }
}

