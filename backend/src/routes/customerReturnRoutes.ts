import { Router } from "express";
import { requestReturn, getMyReturns } from "../modules/customer/controllers/customerReturnController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// All routes require authentication and Customer user type
router.use(authenticate);
router.use(requireUserType("Customer"));

router.post("/", requestReturn);
router.get("/", getMyReturns);

export default router;
