import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Seller from "../../../models/Seller";
import Product from "../../../models/Product";
import Category from "../../../models/Category";
import Shop from "../../../models/Shop";
import mongoose from "mongoose";

/**
 * Get all sellers
 * GET /api/admin/sellers-manage/list
 */
export const getAllSellers = asyncHandler(async (_req: Request, res: Response) => {
    const sellers = await Seller.find({})
        .select("sellerName email storeName status createdAt")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        message: "Sellers fetched successfully",
        data: sellers,
    });
});

/**
 * Get seller details with shop and categorized products
 * GET /api/admin/sellers-manage/:id
 */
export const getSellerDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid seller ID",
        });
    }

    const seller = await Seller.findById(id);
    if (!seller) {
        return res.status(404).json({
            success: false,
            message: "Seller not found",
        });
    }

    // Find products for this seller
    const products = await Product.find({ seller: id })
        .populate("category", "name")
        .sort({ category: 1, productName: 1 });

    // Fetch top-level parent categories for product form
    const categories = await Category.find({ status: "Active", parentId: null }).select("name");

    return res.status(200).json({
        success: true,
        message: "Seller details fetched successfully",
        data: {
            seller,
            products,
            categories,
        },
    });
});

/**
 * Add product for a seller
 * POST /api/admin/sellers-manage/:id/product
 */
export const addSellerProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const productData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid seller ID",
        });
    }

    const seller = await Seller.findById(id);
    if (!seller) {
        return res.status(404).json({
            success: false,
            message: "Seller not found",
        });
    }

    const product = new Product({
        ...productData,
        seller: id,
        status: "Active",
        publish: true,
    });

    await product.save();

    return res.status(201).json({
        success: true,
        message: "Product added successfully",
        data: product,
    });
});

/**
 * Update a product
 * PUT /api/admin/sellers-manage/products/:productId
 */
export const updateSellerProduct = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
        });
    }

    const product = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
    });
});

/**
 * Delete a product
 * DELETE /api/admin/sellers-manage/products/:productId
 */
export const deleteSellerProduct = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
        });
    }

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    });
});
