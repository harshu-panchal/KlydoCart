import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Return from "../../../models/Return";
// import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import { notifyDeliveryBoysOfNewReturn } from "../../../services/orderNotificationService";

export const getReturnRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user?.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = {};
    if (status && status !== 'All Status') {
      query.status = status;
    }

    // Find return requests where the associated OrderItem belongs to this seller
    // 1. Find OrderItems for this seller
    const sellerOrderItems = await OrderItem.find({ seller: sellerId }).select('_id');
    const sellerOrderItemIds = sellerOrderItems.map(item => item._id);

    // 2. Filter Returns by these OrderItem IDs
    query.orderItem = { $in: sellerOrderItemIds };

    const returns = await Return.find(query)
      .populate({
        path: 'orderItem',
        select: 'productName productImage quantity unitPrice total sku'
      })
      .populate({
        path: 'order',
        select: 'orderNumber customerName'
      })
      .populate('customer', 'name email mobile')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Return.countDocuments(query);

    // Map to frontend friendly format
    const formattedReturns = returns.map(ret => {
      const item = ret.orderItem as any;
      const order = ret.order as any;
      return {
        id: ret._id,
        orderItemId: item?._id?.toString() || 'Unknown ID',
        product: item?.productName || 'Unknown Product',
        variant: 'N/A',
        price: item?.unitPrice || 0,
        discPrice: item?.unitPrice || 0,
        quantity: ret.quantity || item?.quantity || 1,
        total: (item?.unitPrice || 0) * (ret.quantity || item?.quantity || 1),
        status: ret.status,
        date: new Date(ret.createdAt).toLocaleDateString(),
        customerName: order?.customerName || 'Unknown Customer',
        orderId: order?.orderNumber || 'Unknown Order',
        returnReason: ret.reason,
        returnDescription: ret.description,
        image: item?.productImage
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedReturns,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  }
);

export const getReturnRequestById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const returnRequest = await Return.findById(id)
      .populate({
        path: 'orderItem',
        select: 'productName productImage quantity unitPrice total sku'
      })
      .populate({
        path: 'order',
        select: 'orderNumber customerName deliveryAddress paymentMethod'
      })
      .populate('customer', 'name email mobile');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found"
      });
    }

    const item = returnRequest.orderItem as any;
    const order = returnRequest.order as any;

    const formattedDetail = {
      id: returnRequest._id,
      orderId: order?.orderNumber,
      orderDate: order?.createdAt, // Or orderDate if available
      status: returnRequest.status,
      customerName: order?.customerName,
      customerEmail: (returnRequest.customer as any)?.email,
      customerPhone: (returnRequest.customer as any)?.mobile,
      shippingAddress: order?.deliveryAddress ? `${order.deliveryAddress.address}, ${order.deliveryAddress.city}, ${order.deliveryAddress.pincode}` : 'N/A',
      paymentMethod: order?.paymentMethod,
      items: [
        {
          id: item?._id,
          name: item?.productName,
          sku: item?.sku || 'N/A',
          price: item?.unitPrice || 0,
          quantity: returnRequest.quantity, // Return quantity might differ from order item quantity? Using return quantity.
          total: (item?.unitPrice || 0) * returnRequest.quantity,
          image: item?.productImage
        }
      ],
      subtotal: (item?.unitPrice || 0) * returnRequest.quantity,
      tax: 0, // Mock for now
      total: (item?.unitPrice || 0) * returnRequest.quantity,
      reason: returnRequest.reason,
      reasonDescription: returnRequest.description
    };


    return res.status(200).json({
      success: true,
      data: formattedDetail,
    });
  }
);

export const updateReturnStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const returnRequest = await Return.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('order').populate('orderItem').populate('seller');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found"
      });
    }

    // If status is Approved, notify nearby delivery boys
    if (status === "Approved") {
      const io = req.app.get("io");
      if (io) {
        // Will implement notifyDeliveryBoysOfNewReturn in orderNotificationService
        notifyDeliveryBoysOfNewReturn(io, returnRequest).catch(err => {
            console.error("Failed to notify delivery boys of new return:", err);
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Return status updated successfully",
      data: returnRequest
    });
  }
);
