import { Router } from "express";
import FAQ from "../models/FAQ";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

/**
 * Get FAQs by category (Public)
 */
router.get("/faqs", asyncHandler(async (req, res) => {
    const { category } = req.query;
    
    const query: any = { status: "Active" };
    if (category) {
        query.category = category;
    }

    const faqs = await FAQ.find(query).sort({ order: 1, createdAt: -1 });

    return res.status(200).json({
        success: true,
        data: faqs
    });
}));

export default router;
