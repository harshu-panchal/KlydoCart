import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Seller from "../../../models/Seller";
import Product from "../../../models/Product";
import Category from "../../../models/Category";

/**
 * Get all sellers (for dropdowns/lists) with category counts
 */
export const getAllSellers = asyncHandler(async (_req: Request, res: Response) => {
    const sellers = await Seller.find({})
        .select("sellerName storeName profile status mobile email logo balance commission category city serviceableArea panCard taxName taxNumber searchLocation latitude longitude serviceRadiusKm accountName bankName branch accountNumber ifsc idProof addressProof requireProductApproval viewCustomerDetails")
        .sort({ storeName: 1 });

    // Enhance sellers with category data from their actual products
    const sellersWithCategories = await Promise.all(sellers.map(async (seller) => {
        // Get unique category IDs from products belonging to this seller
        const uniqueCategoryIds = await Product.distinct("category", { 
            seller: seller._id,
            status: "Active" // Only count categories with active products
        });

        // Get the names of these categories
        const categoryNames = await Category.find({ 
            _id: { $in: uniqueCategoryIds } 
        }).select("name");

        return {
            ...seller.toObject(),
            categoryCount: uniqueCategoryIds.length,
            categories: categoryNames.map(c => c.name)
        };
    }));

    return res.status(200).json({
        success: true,
        message: "Sellers fetched successfully",
        data: sellersWithCategories,
    });
});
