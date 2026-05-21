import { Router } from "express";
import * as customerController from "../modules/customer/controllers/customerController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Get customer profile (protected route)
router.get("/profile", authenticate, customerController.getProfile);

// Update customer profile (protected route)
router.put("/profile", authenticate, customerController.updateProfile);

// Update customer location (protected route)
router.post("/location", authenticate, customerController.updateLocation);

// Credit wallet (for demo/testing)
router.post("/wallet/credit", authenticate, customerController.creditWallet);

// Get wallet transactions (protected route)
router.get("/wallet/transactions", authenticate, customerController.getWalletTransactions);

// Get customer location (protected route)
router.get("/location", authenticate, customerController.getLocation);

export default router;
