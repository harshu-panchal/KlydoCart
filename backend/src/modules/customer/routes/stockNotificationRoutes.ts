import express from "express";
import {
  subscribeToStockNotification,
  getStockNotifications,
  checkSubscription,
  unsubscribeFromStockNotification,
} from "../controllers/customerStockNotificationController";
import { authenticate } from "../../../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Subscribe to stock notification
router.post("/", subscribeToStockNotification);

// Get all subscriptions
router.get("/", getStockNotifications);

// Check if subscribed to a product
router.get("/check/:productId", checkSubscription);

// Unsubscribe
router.delete("/:id", unsubscribeFromStockNotification);

export default router;
