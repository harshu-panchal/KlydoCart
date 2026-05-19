import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Return from "../../../models/Return";
import Notification from "../../../models/Notification";
import { returnNotificationStates, isDeliveryBoyBusy } from "../../../services/orderNotificationService";

/**
 * Delivery boy accepts a return pickup
 */
export const acceptReturnPickup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deliveryId = req.user?.userId;

    // Check if delivery boy is already busy with another order or return request
    if (deliveryId) {
        const isBusy = await isDeliveryBoyBusy(deliveryId);
        if (isBusy) {
            return res.status(400).json({
                success: false,
                message: "You are currently busy with another active order or return request"
            });
        }
    }

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
        return res.status(404).json({ success: false, message: "Return request not found" });
    }

    if (returnRequest.status !== "Approved") {
        return res.status(400).json({ success: false, message: "Return request is not approved for pickup" });
    }

    if (returnRequest.deliveryBoy) {
        return res.status(400).json({ success: false, message: "This return is already assigned to another delivery boy" });
    }

    returnRequest.deliveryBoy = deliveryId;
    returnRequest.pickupStatus = "Assigned";
    await returnRequest.save();

    // Emit socket event to notify other delivery boys that this return pickup was accepted
    const io = req.app.get("io");
    if (io) {
        const state = returnNotificationStates.get(id);
        const normalizedDeliveryBoyId = String(deliveryId).trim();
        
        if (state) {
            state.acceptedBy = normalizedDeliveryBoyId;
            for (const notifiedId of state.notifiedDeliveryBoys) {
                const notifiedIdString = String(notifiedId).trim();
                io.to(`delivery-${notifiedIdString}`).emit('return-accepted', {
                    returnId: id,
                    acceptedBy: normalizedDeliveryBoyId,
                });
            }
            returnNotificationStates.delete(id);
        } else {
            // Fallback: emit to the accepted delivery boy
            io.to(`delivery-${normalizedDeliveryBoyId}`).emit('return-accepted', {
                returnId: id,
                acceptedBy: normalizedDeliveryBoyId,
            });
        }
    }

    return res.status(200).json({
        success: true,
        message: "Return pickup accepted successfully",
        data: returnRequest
    });
});

/**
 * Delivery boy gets their assigned returns
 */
export const getAssignedReturns = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;

    const returns = await Return.find({ deliveryBoy: deliveryId })
        .populate('order', 'orderNumber deliveryAddress customerName customerPhone')
        .populate('seller', 'storeName address')
        .sort({ updatedAt: -1 });

    return res.status(200).json({
        success: true,
        data: returns
    });
});

/**
 * Delivery boy confirms pickup and uploads photo
 * Note: Image upload should be handled via a middleware before this controller if uploading actual files.
 * Assuming image URLs are passed in the body if handled by an external upload service.
 */
export const confirmReturnPickup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { images } = req.body;
    const deliveryId = req.user?.userId;

    if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, message: "At least one pickup image is required" });
    }

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
        return res.status(404).json({ success: false, message: "Return request not found" });
    }

    console.log(`[confirmReturnPickup] req.params.id: ${id}`);
    console.log(`[confirmReturnPickup] req.user?.userId (deliveryId): ${deliveryId}`);
    console.log(`[confirmReturnPickup] returnRequest.deliveryBoy: ${returnRequest.deliveryBoy}`);
    console.log(`[confirmReturnPickup] returnRequest.deliveryBoy?.toString(): ${returnRequest.deliveryBoy?.toString()}`);

    if (returnRequest.deliveryBoy?.toString() !== deliveryId) {
        return res.status(403).json({ success: false, message: "This return is not assigned to you" });
    }

    returnRequest.pickupImages = images;
    returnRequest.pickupStatus = "Picked Up";
    returnRequest.pickupCompleted = new Date();
    // Move to Processing state so admin can verify it
    returnRequest.status = "Processing"; 

    await returnRequest.save();

    return res.status(200).json({
        success: true,
        message: "Return pickup confirmed",
        data: returnRequest
    });
});

/**
 * Delivery boy confirms drop-off at the seller's store, completing the return request
 */
export const confirmReturnDropoff = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { images } = req.body;
    const deliveryId = req.user?.userId;

    if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, message: "At least one drop-off image is required" });
    }

    const returnRequest = await Return.findById(id).populate('orderItem').populate('seller', 'storeName');

    if (!returnRequest) {
        return res.status(404).json({ success: false, message: "Return request not found" });
    }

    if (returnRequest.deliveryBoy?.toString() !== deliveryId) {
        return res.status(403).json({ success: false, message: "This return is not assigned to you" });
    }

    if (returnRequest.pickupStatus !== "Picked Up") {
        return res.status(400).json({ success: false, message: "Return request has not been picked up yet" });
    }

    if (returnRequest.status === "Completed") {
        return res.status(400).json({ success: false, message: "This return is already completed and refunded" });
    }

    // Update return request pickupStatus to Dropped Off so it disappears from delivery boy's active tasks
    returnRequest.dropoffImages = images;
    returnRequest.pickupStatus = "Dropped Off";
    
    // Ensure the main status is Processing so Admin/Seller can verify the return
    if (returnRequest.status !== "Completed" && returnRequest.status !== "Rejected") {
        returnRequest.status = "Processing";
    }

    await returnRequest.save();

    // Notify Admin about the dropoff
    const seller: any = returnRequest.seller;
    const storeName = seller?.storeName || 'the seller';
    const notification = new Notification({
        recipientType: "Admin",
        title: "Return Dropped Off",
        message: `A product has been returned to ${storeName} by the delivery partner. Please verify the photos and approve the refund.`,
        type: "System",
        priority: "High",
        link: `/admin/return`
    });
    await notification.save();

    return res.status(200).json({
        success: true,
        message: "Return drop-off confirmed successfully",
        data: returnRequest
    });
});
