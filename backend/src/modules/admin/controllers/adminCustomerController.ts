import mongoose from "mongoose";
import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Customer from "../../../models/Customer";
import Order from "../../../models/Order";
import { processCustomerWalletTransaction } from "../../../services/walletService";

/**
 * Get all customers with filters
 */
export const getAllCustomers = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = "registrationDate",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { email: { $regex: search as string, $options: "i" } },
        { phone: { $regex: search as string, $options: "i" } },
        { refCode: { $regex: search as string, $options: "i" } },
      ];
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [customers, total] = await Promise.all([
      Customer.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "orders",
            let: { customerId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$customer", "$$customerId"] } } },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  spent: { $sum: "$total" }
                }
              }
            ],
            as: "orderStats"
          }
        },
        {
          $addFields: {
            stats: { $arrayElemAt: ["$orderStats", 0] }
          }
        },
        {
          $addFields: {
            totalOrders: { $ifNull: ["$stats.count", 0] },
            totalSpent: { $ifNull: ["$stats.spent", 0] },
            walletAmount: { $ifNull: ["$walletAmount", 0] }
          }
        },
        {
          $project: {
            orderStats: 0,
            stats: 0
          }
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: parseInt(limit as string) }
      ]),
      Customer.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: customers,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Get customer by ID
 */
export const getCustomerById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const customer = await Customer.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "orders",
          let: { customerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$customer", "$$customerId"] } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                spent: { $sum: "$total" }
              }
            }
          ],
          as: "orderStats"
        }
      },
      {
        $addFields: {
          stats: { $arrayElemAt: ["$orderStats", 0] }
        }
      },
      {
        $addFields: {
          totalOrders: { $ifNull: ["$stats.count", 0] },
          totalSpent: { $ifNull: ["$stats.spent", 0] },
          walletAmount: { $ifNull: ["$walletAmount", 0] }
        }
      },
      {
        $project: {
          orderStats: 0,
          stats: 0
        }
      }
    ]);

    if (!customer || customer.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer fetched successfully",
      data: customer[0],
    });
  }
);

/**
 * Update customer status
 */
export const updateCustomerStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive",
      });
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer status updated successfully",
      data: customer,
    });
  }
);

/**
 * Get customer orders
 */
export const getCustomerOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query: any = { customer: id };
    if (status) query.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("items")
        .populate("deliveryBoy", "name mobile")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Customer orders fetched successfully",
      data: orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Update customer wallet balance
 */
export const updateCustomerWallet = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, type, description } = req.body;

    if (!amount || !type || !description) {
      return res.status(400).json({
        success: false,
        message: "Amount, type, and description are required",
      });
    }

    if (!["credit", "debit"].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Type must be Credit or Debit",
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const result = await processCustomerWalletTransaction(
      id,
      Number(amount),
      type.toLowerCase() as "credit" | "debit",
      description
    );

    return res.status(200).json({
      success: true,
      message: `Wallet ${type.toLowerCase() === "credit" ? "credited" : "debited"} successfully`,
      data: result,
    });
  }
);

