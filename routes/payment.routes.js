import express from "express";
import {
  initiatePayment,
  verifyPaymentAndCreateOrder,
  
} from "../controllers/payment.controller.js";
const router = express.Router();

// 1) Create CF order + local Payment + Transaction
router.post("/initiate", initiatePayment);

// 2) Verify after redirect (front-end hits this)
router.get("/verify", verifyPaymentAndCreateOrder);



export { router as paymentRouter };
