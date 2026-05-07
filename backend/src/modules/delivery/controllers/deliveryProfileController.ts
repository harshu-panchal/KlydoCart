import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";

/**
 * Update Delivery Profile
 * Updates personal and vehicle information
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const {
        name,
        email,
        address,
        city,
        vehicleNumber,
        vehicleType,
        bankName,
        accountNumber,
        ifscCode
    } = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Update fields if provided
    if (name) delivery.name = name;
    if (email) delivery.email = email;
    if (address) delivery.address = address;
    if (city) delivery.city = city;
    if (vehicleNumber) delivery.vehicleNumber = vehicleNumber;
    if (vehicleType) delivery.vehicleType = vehicleType;

    // Bank details updates
    if (bankName) delivery.bankName = bankName;
    if (accountNumber) delivery.accountNumber = accountNumber;
    if (ifscCode) delivery.ifscCode = ifscCode;

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: delivery
    });
});

/**
 * Update Availability Status
 * Toggles isOnline status
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: "isOnline status must be a boolean"
        });
    }

    const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { isOnline },
        { new: true }
    );

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    return res.status(200).json({
        success: true,
        message: `Status updated to ${isOnline ? 'Online' : 'Offline'}`,
        data: {
            isOnline: delivery.isOnline
        }
    });
});

/**
 * Update Delivery Settings
 * Updates notification, location, sound preferences
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { notifications, location, sound } = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Initialize settings if not present
    if (!delivery.settings) {
        delivery.settings = {
            notifications: true,
            location: true,
            sound: true
        };
    }

    if (typeof notifications === 'boolean') delivery.settings.notifications = notifications;
    if (typeof location === 'boolean') delivery.settings.location = location;
    if (typeof sound === 'boolean') delivery.settings.sound = sound;

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: delivery.settings
    });
});

/**
 * Save FCM Push Token
 * Allows delivery boy's device to register for push notifications
 */
export const saveFcmToken = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { token, platform } = req.body; // platform: 'web' | 'mobile'

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: "A valid FCM token is required"
        });
    }

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Use $addToSet to avoid duplicate tokens
    const field = platform === 'mobile' ? 'fcmTokenMobile' : 'fcmTokens';
    await Delivery.findByIdAndUpdate(deliveryId, {
        $addToSet: { [field]: token.trim() }
    });

    console.log(`📱 FCM token saved for delivery boy ${deliveryId} (platform: ${platform || 'web'})`);

    return res.status(200).json({
        success: true,
        message: "FCM token registered successfully"
    });
});

/**
 * Remove FCM Push Token (called on logout)
 */
export const removeFcmToken = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { token, platform } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
    }

    const field = platform === 'mobile' ? 'fcmTokenMobile' : 'fcmTokens';
    await Delivery.findByIdAndUpdate(deliveryId, {
        $pull: { [field]: token }
    });

    return res.status(200).json({
        success: true,
        message: "FCM token removed successfully"
    });
});
