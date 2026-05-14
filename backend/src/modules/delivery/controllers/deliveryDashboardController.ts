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

    const objectId = new mongoose.Types.ObjectId(deliveryId);

    // Aggregation to get counts in one go
    const stats = await Order.aggregate([
        {
            $match: {
                deliveryBoy: objectId,
                // We consider orders active or touching today
            }
        },
        {
            $group: {
                _id: null,
                // Pending: Active statuses
                // Pending: Active statuses AND touched today
                pendingOrders: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $in: ["$status", ["Ready for pickup", "Out for Delivery", "Picked Up", "Assigned", "In Transit"]] },
                                    {
                                        $or: [
                                            { $and: [{ $gte: ["$createdAt", todayStart] }, { $lte: ["$createdAt", todayEnd] }] },
                                            { $and: [{ $gte: ["$updatedAt", todayStart] }, { $lte: ["$updatedAt", todayEnd] }] }
                                        ]
                                    }
                                ]
                            },
                            1, 0]
                    }
                },
                // All Orders Today: Created today OR Updated today
                allOrdersToday: {
                    $sum: {
                        $cond: [{
                            $or: [
                                { $and: [{ $gte: ["$createdAt", todayStart] }, { $lte: ["$createdAt", todayEnd] }] },
                                { $and: [{ $gte: ["$updatedAt", todayStart] }, { $lte: ["$updatedAt", todayEnd] }] }
                            ]
                        }, 1, 0]
                    }
                },
                // Return Orders Today
                returnOrdersToday: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $in: ["$status", ["Returned", "Cancelled"]] },
                                    {
                                        $or: [
                                            { $and: [{ $gte: ["$createdAt", todayStart] }, { $lte: ["$createdAt", todayEnd] }] },
                                            { $and: [{ $gte: ["$updatedAt", todayStart] }, { $lte: ["$updatedAt", todayEnd] }] }
                                        ]
                                    }
                                ]
                            }, 1, 0]
                    }
                },
                // Daily Collection: Cash collected from COD orders delivered TODAY
                dailyCollection: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$status", "Delivered"] },
                                    { $eq: ["$paymentMethod", "COD"] }, // Assuming 'COD' string for Cash on Delivery
                                    { $gte: ["$deliveredAt", todayStart] },
                                    { $lte: ["$deliveredAt", todayEnd] }
                                ]
                            },
                            "$total", // Sum the order total
                            0
                        ]
                    }
                },
                // Today's Earning: Commission earned today (Mock calculation: 40 per order)
                // In real app, this should come from a Commission model or field on Order
                todayDeliveredCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$status", "Delivered"] },
                                    { $gte: ["$deliveredAt", todayStart] },
                                    { $lte: ["$deliveredAt", todayEnd] }
                                ]
                            }, 1, 0
                        ]
                    }
                },
                // Total Completed Deliveries (Lifetime)
                totalDeliveredCount: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0]
                    }
                },
                // Actual Earnings: Sum of shipping charges for delivered orders
                todayActualEarning: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$status", "Delivered"] },
                                    { $gte: ["$deliveredAt", todayStart] },
                                    { $lte: ["$deliveredAt", todayEnd] }
                                ]
                            },
                            "$shipping",
                            0
                        ]
                    }
                },
                totalActualEarning: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", "Delivered"] },
                            "$shipping",
                            0
                        ]
                    }
                }

            }
        }
    ]);

    const result = stats[0] || {
        pendingOrders: 0,
        allOrdersToday: 0,
        returnOrdersToday: 0,
        dailyCollection: 0,
        todayDeliveredCount: 0,
        totalDeliveredCount: 0,
        todayActualEarning: 0,
        totalActualEarning: 0
    };

    // Calculate Earnings using actual shipping fees if available, 
    // otherwise fallback to a calculated commission or fixed rate
    const COMMISSION_RATE = deliveryPartner.commissionRate || 100; // Default to 100% of shipping if not specified
    const todayEarning = result.todayActualEarning > 0 
        ? (result.todayActualEarning * COMMISSION_RATE / 100) 
        : (result.todayDeliveredCount * 40); // Absolute fallback to 40 per order if no shipping info
        
    const totalEarning = result.totalActualEarning > 0
        ? (result.totalActualEarning * COMMISSION_RATE / 100)
        : (result.totalDeliveredCount * 40);

    // Fetch list of Pending Orders for the "Today's Pending Order" section
    const pendingOrdersList = await Order.find({
        deliveryBoy: deliveryId,
        status: { $in: ["Ready for pickup", "Out for Delivery", "Picked Up", "Assigned", "In Transit"] },
        $or: [
            { createdAt: { $gte: todayStart, $lte: todayEnd } },
            { updatedAt: { $gte: todayStart, $lte: todayEnd } }
        ]
    })
        .select("orderNumber customerName deliveryAddress status total estimatedDeliveryDate") // Select necessary fields
        .sort({ createdAt: -1 })
        .limit(5);

    // Format pending list for Frontend
    const formattedPendingList = pendingOrdersList.map(order => ({
        id: order._id,
        orderId: order.orderNumber,
        customerName: order.customerName,
        status: order.status, // Map backend status to frontend status if needed
        address: `${order.deliveryAddress.address}, ${order.deliveryAddress.city}`, // Simplify address
        totalAmount: order.total,
        estimatedDeliveryTime: order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
    }));

    return res.status(200).json({
        success: true,
        data: {
            dailyCollection: result.dailyCollection,
            cashBalance: deliveryPartner.cashCollected, // This field stores total cash holding
            pendingOrders: result.pendingOrders,
            allOrders: result.allOrdersToday,
            returnOrders: result.returnOrdersToday,
            returnItems: 0, // Need 'OrderItem' logic for this, keeping 0 for now
            todayEarning: todayEarning,
            totalEarning: totalEarning,
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
        { label: 'Live Chat', value: 'Available 24/7', icon: 'chat' },
    ];

    res.status(200).json({
        success: true,
        data: {
            faqs: dynamicFaqs,
            contact: contactOptions
        }
    });
});
