import { Router } from "express";
import { authenticate, requireUserType } from "../middleware/auth";
import * as adminSellerManagementController from "../modules/admin/controllers/adminSellerManagementController";

const router = Router();

// Route: GET /api/admin/sellers-manage/list
router.get(
    "/list",
    authenticate,
    requireUserType("Admin"),
    adminSellerManagementController.getAllSellers
);

// Route: GET /api/admin/sellers-manage/:id
router.get(
    "/:id",
    authenticate,
    requireUserType("Admin"),
    adminSellerManagementController.getSellerDetails
);

// Route: POST /api/admin/sellers-manage/:id/product
router.post(
    "/:id/product",
    authenticate,
    requireUserType("Admin"),
    adminSellerManagementController.addSellerProduct
);

// Route: PUT /api/admin/sellers-manage/products/:productId
router.put(
    "/products/:productId",
    authenticate,
    requireUserType("Admin"),
    adminSellerManagementController.updateSellerProduct
);

// Route: DELETE /api/admin/sellers-manage/products/:productId
router.delete(
    "/products/:productId",
    authenticate,
    requireUserType("Admin"),
    adminSellerManagementController.deleteSellerProduct
);

export default router;
