import { Request, Response } from "express";
import StockNotification from "../../../models/StockNotification";
import Product from "../../../models/Product";
import Notification from "../../../models/Notification";

/**
 * @desc    Subscribe to stock notification for a product
 * @route   POST /api/customer/stock-notifications
 * @access  Private (Customer)
 */
export const subscribeToStockNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const customerId = (req as any).user?.id;
    const { productId, variantId } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if already subscribed
    const existingSubscription = await StockNotification.findOne({
      customerId,
      productId,
      variantId: variantId || null,
      isNotified: false,
    });

    if (existingSubscription) {
      return res.status(200).json({
        success: true,
        message: "You are already subscribed to notifications for this product",
        data: existingSubscription,
      });
    }

    // Create new subscription
    const subscription = await StockNotification.create({
      customerId,
      productId,
      variantId: variantId || null,
    });

    return res.status(201).json({
      success: true,
      message: "You will be notified when this product is back in stock",
      data: subscription,
    });
  } catch (error: any) {
    console.error("Error subscribing to stock notification:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to subscribe to stock notification",
    });
  }
};

/**
 * @desc    Get customer's stock notification subscriptions
 * @route   GET /api/customer/stock-notifications
 * @access  Private (Customer)
 */
export const getStockNotifications = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const subscriptions = await StockNotification.find({
      customerId,
      isNotified: false,
    })
      .populate("productId", "name productName mainImage imageUrl price")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    console.error("Error fetching stock notifications:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stock notifications",
    });
  }
};

/**
 * @desc    Check if customer is subscribed to a product
 * @route   GET /api/customer/stock-notifications/check/:productId
 * @access  Private (Customer)
 */
export const checkSubscription = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;
    const { productId } = req.params;
    const { variantId } = req.query;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const subscription = await StockNotification.findOne({
      customerId,
      productId,
      variantId: variantId || null,
      isNotified: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        isSubscribed: !!subscription,
        subscription: subscription || null,
      },
    });
  } catch (error: any) {
    console.error("Error checking subscription:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check subscription",
    });
  }
};

/**
 * @desc    Unsubscribe from stock notification
 * @route   DELETE /api/customer/stock-notifications/:id
 * @access  Private (Customer)
 */
export const unsubscribeFromStockNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const customerId = (req as any).user?.id;
    const { id } = req.params;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const subscription = await StockNotification.findOneAndDelete({
      _id: id,
      customerId,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error: any) {
    console.error("Error unsubscribing:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to unsubscribe",
    });
  }
};

/**
 * @desc    Notify customers when product is back in stock (Admin/System use)
 * @route   POST /api/admin/stock-notifications/notify/:productId
 * @access  Private (Admin/System)
 */
export const notifyCustomersProductInStock = async (
  req: Request,
  res: Response
) => {
  try {
    const { productId } = req.params;
    const { variantId } = req.body;

    // Find all pending subscriptions for this product
    const subscriptions = await StockNotification.find({
      productId,
      variantId: variantId || null,
      isNotified: false,
    }).populate("productId", "name productName");

    if (subscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending subscriptions found",
        data: { notifiedCount: 0 },
      });
    }

    const product = subscriptions[0].productId as any;
    const productName = product?.name || product?.productName || "Product";

    // Create notifications for all subscribed customers
    const notificationPromises = subscriptions.map(async (subscription) => {
      // Create in-app notification
      await Notification.create({
        recipientType: "Customer",
        recipientId: subscription.customerId,
        title: "Product Back in Stock!",
        message: `${productName} is now available. Order now before it runs out!`,
        type: "Info",
        link: `/product/${productId}`,
        actionLabel: "View Product",
        priority: "High",
      });

      // Mark subscription as notified
      subscription.isNotified = true;
      subscription.notifiedAt = new Date();
      await subscription.save();
    });

    await Promise.all(notificationPromises);

    return res.status(200).json({
      success: true,
      message: `Notified ${subscriptions.length} customers`,
      data: { notifiedCount: subscriptions.length },
    });
  } catch (error: any) {
    console.error("Error notifying customers:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to notify customers",
    });
  }
};
