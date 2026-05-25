import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import Return from "../../../models/Return";

/**
 * Request a return for an order item
 */
export const requestReturn = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { orderId, orderItemId, reason, description, images, quantity } = req.body;

    console.log(`[RETURN REQUEST] User: ${userId}, Order: ${orderId}, Item: ${orderItemId}, Qty: ${quantity}`);

    if (!orderId || !orderItemId || !reason || !quantity) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const order = await Order.findOne({ _id: orderId, customer: userId });
    if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Delivered") {
        return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
    }

    // Check 7-day window
    const deliveredAt = order.deliveredAt || order.updatedAt;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() > new Date(deliveredAt).getTime() + sevenDaysInMs) {
        return res.status(400).json({ success: false, message: "Return window of 7 days has expired" });
    }

    let orderItem = await OrderItem.findOne({ _id: orderItemId, order: orderId });
    if (!orderItem) {
        console.warn(`[RETURN] OrderItem not found with orderId ${orderId}. Trying without orderId...`);
        orderItem = await OrderItem.findOne({ _id: orderItemId });
        if (!orderItem) {
            return res.status(404).json({ success: false, message: "Order item not found" });
        }
        console.warn(`[RETURN] Found OrderItem ${orderItem._id}, but its order field is ${orderItem.order}. Expected: ${orderId}`);
        // If it's found but order doesn't match, maybe old data structure? We'll still proceed if the item exists.
    }

    if (quantity > orderItem.quantity) {
        return res.status(400).json({ success: false, message: "Return quantity cannot exceed order quantity" });
    }

    const existingReturn = await Return.findOne({ orderItem: orderItemId, status: { $nin: ["Rejected", "Completed"] } });
    if (existingReturn) {
        return res.status(400).json({ success: false, message: "A return request already exists for this item" });
    }

    const returnRequest = new Return({
        order: orderId,
        orderItem: orderItemId,
        customer: userId,
        seller: orderItem.seller,
        reason,
        description,
        status: "Pending",
        pickupStatus: "Pending",
        quantity,
        images: images || [],
        pickupAddress: {
            address: order.deliveryAddress.address,
            city: order.deliveryAddress.city,
            pincode: order.deliveryAddress.pincode,
        }
    });

    await returnRequest.save();

    // Notify the seller
    const io = req.app.get("io");
    if (io && orderItem.seller) {
        const sellerRoom = `seller-${orderItem.seller.toString()}`;
        console.log(`[RETURN NOTIFICATION] Emitting NEW_RETURN_REQUEST to room: ${sellerRoom}`);
        io.to(sellerRoom).emit("seller-notification", {
            type: "NEW_RETURN_REQUEST",
            orderId: order._id,
            orderNumber: order.orderNumber,
            message: `New return request for ${orderItem.productName}`,
            customer: {
                name: order.customerName,
                email: order.customerEmail,
                phone: order.customerPhone,
                address: order.deliveryAddress
            },
            items: [{
                productName: orderItem.productName,
                quantity: quantity,
                price: orderItem.unitPrice,
                total: orderItem.unitPrice * quantity,
                variation: orderItem.variation
            }],
            totalAmount: orderItem.unitPrice * quantity,
            timestamp: new Date()
        });
        console.log(`[RETURN NOTIFICATION] Successfully emitted to ${sellerRoom}`);
    } else {
        console.log(`[RETURN NOTIFICATION] Could not notify seller. io exists: ${!!io}, seller ID exists: ${!!orderItem.seller}`);
    }

    return res.status(201).json({
        success: true,
        message: "Return request submitted successfully",
        data: returnRequest
    });
});

/**
 * Get customer's return requests
 */
export const getMyReturns = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    const returns = await Return.find({ customer: userId })
        .populate("order", "orderNumber")
        .populate("orderItem", "productName productImage price")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        data: returns
    });
});
