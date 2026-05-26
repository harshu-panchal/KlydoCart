import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";
import Order from "../../../models/Order";
import mongoose from "mongoose";
import FAQ from "../../../models/FAQ";

/**
 * Get Dashboard Stats
 * Returns: Daily Collection, Cash Balance, Pending Orders, All Orders, etc.
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    // Assuming user ID is attached to req.user by auth middleware
    const deliveryId = req.user?.userId;

    if (!deliveryId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Fetch Delivery Partner Details (for Cash Balance)
    const deliveryPartner = await Delivery.findById(deliveryId);
    if (!deliveryPartner) {
        return res.status(404).json({ success: false, message: "Delivery partner not found" });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 2. Fetch Orders Assigned to this Partner
    // We need:
    // - Pending Orders (Ready for pickup, Out for delivery, Picked Up)
    // - Today's All Orders (Created today OR Delivered today?) -> "Today's All Order" usually means active + completed today
    // - Today's Delivered Orders (for Earnings & Collection)
    // - Return Orders

    // 2. Fetch Orders Assigned to this Partner
    // We'll use explicit queries for better reliability and real-time accuracy
    const objectId = new mongoose.Types.ObjectId(deliveryId);

    // Fetch active orders for counts
    const allAssignedOrders = await Order.find({ deliveryBoy: objectId });

    const pendingOrders = allAssignedOrders.filter(order => 
        ["Processed", "Shipped", "Out for Delivery", "On the way"].includes(order.status) &&
        (order.createdAt >= todayStart || order.updatedAt >= todayStart)
    ).length;

    const allOrdersToday = allAssignedOrders.filter(order => 
        (order.createdAt >= todayStart && order.createdAt <= todayEnd) || 
        (order.updatedAt >= todayStart && order.updatedAt <= todayEnd)
    ).length;

    const returnOrdersToday = allAssignedOrders.filter(order => 
        ["Returned", "Cancelled", "Rejected"].includes(order.status) &&
        (order.createdAt >= todayStart || order.updatedAt >= todayStart)
    ).length;

    // Daily Collection: Sum total of COD orders delivered TODAY
    const deliveredToday = allAssignedOrders.filter(order => 
        order.status === "Delivered" && 
        (order.deliveredAt >= todayStart && order.deliveredAt <= todayEnd || 
         order.updatedAt >= todayStart && order.updatedAt <= todayEnd)
    );

    const dailyCollection = deliveredToday
        .filter(order => ["COD", "cod", "Cash on Delivery", "Cash", "CASH"].includes(order.paymentMethod))
        .reduce((sum, order) => sum + (order.total || 0), 0);

    // Earnings calculation
    const COMMISSION_RATE = deliveryPartner.commissionRate || 100;
    
    const todayEarning = deliveredToday
        .reduce((sum, order) => {
            const ship = order.shipping || 0;
            return sum + (ship > 0 ? (ship * COMMISSION_RATE / 100) : 40);
        }, 0);

    const totalDelivered = allAssignedOrders.filter(order => order.status && order.status.toLowerCase() === "delivered");
    const totalEarning = totalDelivered
        .reduce((sum, order) => {
            const ship = order.shipping || 0;
            return sum + (ship > 0 ? (ship * COMMISSION_RATE / 100) : 40);
        }, 0);

    // Fetch list of Pending Orders for the "Today's Pending Order" section
    const pendingOrdersList = await Order.find({
        deliveryBoy: deliveryId,
        status: { $in: ["Processed", "Shipped", "Out for Delivery", "On the way"] },
        $or: [
            { createdAt: { $gte: todayStart, $lte: todayEnd } },
            { updatedAt: { $gte: todayStart, $lte: todayEnd } }
        ]
    })
        .select("orderNumber customerName deliveryAddress status total shipping estimatedDeliveryDate")
        .sort({ updatedAt: -1 })
        .limit(5);

    // Format pending list for Frontend
    const formattedPendingList = pendingOrdersList.map(order => {
        const ship = order.shipping || 0;
        const deliveryFare = ship > 0 ? (ship * COMMISSION_RATE / 100) : 40;

        return {
            id: order._id,
            orderId: order.orderNumber,
            customerName: order.customerName,
            status: order.status,
            address: order.deliveryAddress ? `${order.deliveryAddress.address}, ${order.deliveryAddress.city}` : 'N/A',
            totalAmount: order.total,
            deliveryFare: Math.round(deliveryFare * 100) / 100,
            estimatedDeliveryTime: order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
        };
    });

    return res.status(200).json({
        success: true,
        data: {
            dailyCollection: dailyCollection,
            cashBalance: deliveryPartner.cashCollected || 0,
            pendingOrders: pendingOrders,
            allOrders: allOrdersToday,
            totalDeliveries: totalDelivered.length,
            returnOrders: returnOrdersToday,
            returnItems: 0,
            todayEarning: Math.round(todayEarning * 100) / 100,
            totalEarning: Math.round(totalEarning * 100) / 100,
            pendingOrdersList: formattedPendingList
        }
    });

});

/**
 * Get Help & Support Data
 */
export const getHelpSupport = asyncHandler(async (_req: Request, res: Response) => {
    const dynamicFaqs = await FAQ.find({
        category: "Delivery",
        status: "Active"
    }).sort({ order: 1, createdAt: -1 });

    const contactOptions = [
        { label: 'Call Support', value: '+91 7846940429', icon: 'phone' },
        { label: 'Email Support', value: 'support@klydocart.com', icon: 'email' },
    ];

    const defaultFaqs = [
        { question: "How to check my daily earnings?", answer: "Go to the Wallet section from the bottom navigation to view your daily and total earnings." },
        { question: "What to do if the customer is not reachable?", answer: "Try calling the customer via the order details page. If they are still unreachable, contact support immediately." },
        { question: "How do I update my profile information?", answer: "You can update your profile details in the Profile section under the Menu tab." },
        { question: "How to report a delivery issue?", answer: "Use the 'Direct Support Call' button or email us at support@klydocart.com with the order ID." }
    ];

    res.status(200).json({
        success: true,
        data: {
            faqs: dynamicFaqs.length > 0 ? dynamicFaqs : defaultFaqs,
            contact: contactOptions
        }
    });
});
