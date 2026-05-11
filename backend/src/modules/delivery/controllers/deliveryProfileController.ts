import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";

/**
 * Update Delivery Profile
 * Updates personal and vehicle information
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const updateData = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // List of allowed fields to update directly
    const allowedFields = [
        'name', 'email', 'mobile', 'alternateMobile', 'dateOfBirth', 'age', 'fatherName',
        'address', 'permanentAddress', 'city', 'state', 'pincode', 'emergencyContact',
        'aadhaarNumber', 'panNumber', 'policeVerification', 'vehicleNumber', 'vehicleType',
        'drivingLicenseNumber', 'rcNumber', 'vehicleInsuranceNumber', 'insuranceValidTill',
        'bankName', 'accountName', 'accountNumber', 'ifscCode', 'branchName', 'upiId',
        'profilePic', 'drivingLicense', 'nationalIdentityCard', 'marksheet', 'signature'
    ];

    // Update fields if provided in request body
    allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
            const value = updateData[field];
            
            // Handle Dates
            if (field === 'dateOfBirth' || field === 'insuranceValidTill') {
                if (value && value !== "" && value !== "null") {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        (delivery as any)[field] = date;
                    }
                }
            } 
            // Handle Numeric fields
            else if (field === 'age') {
                if (value !== "") (delivery as any)[field] = Number(value);
            }
            // Handle everything else
            else {
                (delivery as any)[field] = value;
            }
        }
    });

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
