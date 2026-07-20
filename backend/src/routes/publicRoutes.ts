import { Router } from "express";
import FAQ from "../models/FAQ";
import AppSettings from "../models/AppSettings";
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

/**
 * Get App Settings (Public)
 */
router.get("/settings", asyncHandler(async (req, res) => {
    const settings = await AppSettings.getSettings();
    
    // Only return safe public settings
    return res.status(200).json({
        success: true,
        data: {
            appName: settings.appName,
            supportEmail: settings.supportEmail || settings.contactEmail,
            supportPhone: settings.supportPhone || settings.contactPhone,
            contactEmail: settings.contactEmail,
            contactPhone: settings.contactPhone,
            companyWebsite: settings.companyWebsite || "https://klydocart.com"
        }
    });
}));

export default router;
