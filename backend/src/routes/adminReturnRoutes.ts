import { Router } from "express";
import { getReturnsForVerification, approveReturnAndRefund } from "../modules/admin/controllers/adminReturnController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(requireUserType("Admin"));

router.get("/", getReturnsForVerification);
router.post("/:id/approve-refund", approveReturnAndRefund);

export default router;
