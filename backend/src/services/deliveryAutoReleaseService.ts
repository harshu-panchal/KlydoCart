import { Server as SocketIOServer } from 'socket.io';
import Order from '../models/Order';
import Return from '../models/Return';
import {
    notifyDeliveryBoysOfNewOrder,
    notificationStates,
    returnNotificationStates,
} from './orderNotificationService';

/**
 * Auto-release stuck delivery assignments.
 *
 * PROBLEM: A delivery boy is considered "busy" purely because an Order (status in
 * Processed/Shipped/Out for Delivery/On the way) or a Return (pickupStatus Assigned/Picked Up)
 * is still assigned to them. If a boy accepts an order/return and never completes it, that
 * assignment lives forever, so the boy stays "busy" for life and never receives new orders.
 *
 * FIX: A periodic job unassigns any order/return that has been sitting undelivered for longer
 * than DELIVERY_AUTO_RELEASE_MINUTES. The order is put back in the pool (status -> Accepted,
 * deliveryBoy cleared) so other partners get notified, and the boy immediately becomes available.
 *
 * All timings are configurable via env:
 *   DELIVERY_AUTO_RELEASE_MINUTES           (default 45)  -> idle time before an undelivered assignment is reclaimed
 *   DELIVERY_AUTO_RELEASE_INTERVAL_SECONDS  (default 120) -> how often the background scan runs (cheap: an idle cycle is 2 indexed queries returning 0 rows)
 *   DELIVERY_REQUEUE_MAX_AGE_MINUTES        (default 180) -> only re-broadcast released orders created within this window
 *                                                          (prevents spamming boys with ancient/abandoned orders)
 */

// Order statuses that mean "assigned to a boy but not yet completed" => keeps them busy.
const ACTIVE_ORDER_STATUSES = ['Processed', 'Shipped', 'Out for Delivery', 'On the way'];
// Return pickup statuses that keep a boy busy.
const ACTIVE_RETURN_PICKUP_STATUSES = ['Assigned', 'Picked Up'];

export function getAutoReleaseMinutes(): number {
    const val = Number(process.env.DELIVERY_AUTO_RELEASE_MINUTES);
    return Number.isFinite(val) && val > 0 ? val : 45;
}

function getIntervalMs(): number {
    const val = Number(process.env.DELIVERY_AUTO_RELEASE_INTERVAL_SECONDS);
    const seconds = Number.isFinite(val) && val > 0 ? val : 120;
    return seconds * 1000;
}

function getRequeueMaxAgeMinutes(): number {
    const val = Number(process.env.DELIVERY_REQUEUE_MAX_AGE_MINUTES);
    return Number.isFinite(val) && val > 0 ? val : 180;
}

export interface ReleaseResult {
    releasedOrders: number;
    releasedReturns: number;
    orderNumbers: string[];
    returnIds: string[];
}

/**
 * Core reusable release routine. Used by both the background job and the one-off script.
 *
 * @param options.minutes  Assignments older than this many minutes are reclaimed.
 *                         Pass 0 to release EVERY active assignment regardless of age.
 * @param options.io       (optional) Socket server. When provided, re-queued orders are
 *                         re-broadcast to nearby delivery boys.
 * @param options.dryRun   When true, nothing is written - only counts/ids are returned.
 */
export async function releaseStaleAssignments(options: {
    minutes?: number;
    io?: SocketIOServer | null;
    dryRun?: boolean;
} = {}): Promise<ReleaseResult> {
    const minutes = options.minutes ?? getAutoReleaseMinutes();
    const io = options.io ?? null;
    const dryRun = options.dryRun ?? false;

    const result: ReleaseResult = {
        releasedOrders: 0,
        releasedReturns: 0,
        orderNumbers: [],
        returnIds: [],
    };

    // cutoff: assignments whose clock started before this are stale. minutes===0 => everything.
    const cutoff = minutes > 0 ? new Date(Date.now() - minutes * 60 * 1000) : new Date();

    // ---- 1. Stale undelivered ORDERS ----
    // The age filter (updatedAt <= cutoff) is pushed into the DB query, so on a normal cycle
    // where nothing is stale this returns 0 docs and does almost no work — no fetch, no populate.
    // Anchoring on updatedAt means an order that is actively progressing (picked up, out for
    // delivery, ...) keeps resetting the timer and is never reclaimed mid-delivery; only genuinely
    // idle orders (accepted then untouched) match.
    const orderQuery: any = {
        deliveryBoy: { $exists: true, $ne: null },
        status: { $in: ACTIVE_ORDER_STATUSES },
    };
    if (minutes > 0) {
        orderQuery.updatedAt = { $lte: cutoff };
    }
    const staleOrders = await Order.find(orderQuery).populate({ path: 'items', populate: { path: 'seller' } });

    for (const order of staleOrders) {
        const prevDeliveryBoy = order.deliveryBoy?.toString();
        result.orderNumbers.push(order.orderNumber);
        result.releasedOrders += 1;

        if (dryRun) continue;

        // Put the order back in the pool so it can be re-assigned.
        order.deliveryBoy = undefined;
        order.deliveryBoyStatus = undefined;
        order.assignedAt = undefined;
        order.sellerPickups = [] as any; // clear any partial pickups
        order.status = 'Accepted';
        order.adminNotes =
            (order.adminNotes ? order.adminNotes + '\n' : '') +
            `[${new Date().toISOString()}] Auto-released from delivery boy ${prevDeliveryBoy || 'unknown'} (undelivered for > ${minutes} min). Returned to pool.`;

        await order.save();

        // Drop any in-memory notification state so it can be freshly broadcast.
        notificationStates.delete(order._id.toString());

        console.log(
            `♻️ Auto-released order ${order.orderNumber} from delivery boy ${prevDeliveryBoy} (stuck > ${minutes} min).`
        );

        // Re-notify nearby delivery boys so the order actually gets delivered — but ONLY for
        // reasonably fresh orders. Re-broadcasting ancient/abandoned orders would spam every boy.
        if (io) {
            const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();
            const isFresh = orderAgeMs <= getRequeueMaxAgeMinutes() * 60 * 1000;
            if (isFresh) {
                try {
                    await notifyDeliveryBoysOfNewOrder(io, order);
                } catch (err) {
                    console.error(`Error re-notifying delivery boys for released order ${order.orderNumber}:`, err);
                }
            } else {
                console.log(`↩️ Released order ${order.orderNumber} is older than requeue window — freed but not re-broadcast.`);
            }
        }
    }

    // ---- 2. Stale RETURN pickups ----
    const returnQuery: any = {
        deliveryBoy: { $exists: true, $ne: null },
        pickupStatus: { $in: ACTIVE_RETURN_PICKUP_STATUSES },
    };
    if (minutes > 0) {
        returnQuery.updatedAt = { $lte: cutoff };
    }
    const staleReturns = await Return.find(returnQuery);

    for (const ret of staleReturns) {
        const prevDeliveryBoy = ret.deliveryBoy?.toString();
        result.returnIds.push(ret._id.toString());
        result.releasedReturns += 1;

        if (dryRun) continue;

        ret.deliveryBoy = undefined;
        ret.pickupStatus = 'Pending';
        // Keep the return open/approved so it can be re-offered.
        if (ret.status === 'Processing') {
            ret.status = 'Approved';
        }
        await ret.save();

        returnNotificationStates.delete(ret._id.toString());

        console.log(
            `♻️ Auto-released return ${ret._id} from delivery boy ${prevDeliveryBoy} (stuck > ${minutes} min).`
        );
    }

    return result;
}

let intervalHandle: NodeJS.Timeout | null = null;

/**
 * Start the recurring auto-release background job. Safe to call once at server startup.
 */
export function startDeliveryAutoRelease(io: SocketIOServer): void {
    if (intervalHandle) {
        return; // already running
    }

    const minutes = getAutoReleaseMinutes();
    const intervalMs = getIntervalMs();

    console.log(
        `⏱️  Delivery auto-release job started: reclaiming undelivered assignments older than ${minutes} min (checking every ${intervalMs / 1000}s).`
    );

    const run = async () => {
        try {
            const res = await releaseStaleAssignments({ io });
            if (res.releasedOrders > 0 || res.releasedReturns > 0) {
                console.log(
                    `♻️ Auto-release cycle: freed ${res.releasedOrders} order(s) and ${res.releasedReturns} return(s).`
                );
            }
        } catch (err) {
            console.error('Error in delivery auto-release job:', err);
        }
    };

    // Run shortly after boot, then on the interval.
    setTimeout(run, 10 * 1000);
    intervalHandle = setInterval(run, intervalMs);
}

export function stopDeliveryAutoRelease(): void {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}
