import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Return from "../../../models/Return";
import Customer from "../../../models/Customer";
import WalletTransaction from "../../../models/WalletTransaction";
import mongoose from "mongoose";

/**
 * Get all returns pending admin verification (processing state)
 */
export const getReturnsForVerification = asyncHandler(async (req: Request, res: Response) => {
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = {};
    if (status && status !== 'All Status') {
        query.status = status;
    }

    const returns = await Return.find(query)
        .populate('order', 'orderNumber customerName customerEmail')
        .populate('orderItem', 'productName productImage sku price quantity unitPrice total')
        .populate('customer', 'name email')
        .populate('seller', 'storeName')
        .populate('deliveryBoy', 'name phone')
        .sort({ updatedAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

    const total = await Return.countDocuments(query);

    return res.status(200).json({
        success: true,
        data: returns,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }
    });
});

/**
 * Approve return pickup, process refund to customer wallet
 */
export const approveReturnAndRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user?.userId;

    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
    } catch (e) {
        console.warn("MongoDB Transactions not supported or failed to start. Proceeding without transaction.");
        session = null;
    }

    try {
        const returnRequest = session 
            ? await Return.findById(id).populate('orderItem').session(session)
            : await Return.findById(id).populate('orderItem');

        if (!returnRequest) {
            if (session) await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Return request not found" });
        }

        if (returnRequest.status === "Completed") {
            if (session) await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Return is already completed and refunded" });
        }

        const orderItem = returnRequest.orderItem as any;
        const refundAmount = returnRequest.quantity * (orderItem.unitPrice || 0);

        // Update return request status
        returnRequest.status = "Completed";
        returnRequest.processedBy = new mongoose.Types.ObjectId(adminId);
        returnRequest.processedAt = new Date();
        returnRequest.refundAmount = refundAmount;
        if (session) {
            await returnRequest.save({ session });
        } else {
            await returnRequest.save();
        }

        // Add to customer wallet
        const customer = session
            ? await Customer.findById(returnRequest.customer).session(session)
            : await Customer.findById(returnRequest.customer);

        if (!customer) {
            if (session) await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        customer.walletAmount = (customer.walletAmount || 0) + refundAmount;
        if (session) {
            await customer.save({ session });
        } else {
            await customer.save();
        }

        // Create Wallet Transaction
        const transaction = new WalletTransaction({
            userId: customer._id,
            userType: 'CUSTOMER',
            amount: refundAmount,
            type: 'Credit',
            description: `Refund for returned order item ${orderItem.productName}`,
            status: 'Completed',
            reference: `REF-${returnRequest._id}`,
            relatedOrder: returnRequest.order
        });

        if (session) {
            await transaction.save({ session });
            await session.commitTransaction();
        } else {
            await transaction.save();
        }

        return res.status(200).json({
            success: true,
            message: `Return approved and ₹${refundAmount} refunded to customer wallet`,
            data: returnRequest
        });
    } catch (error: any) {
        if (session) await session.abortTransaction();
        return res.status(500).json({
            success: false,
            message: "Failed to process refund",
            error: error.message
        });
    } finally {
        if (session) session.endSession();
    }
});
