import express from "express";

import {
  createPayment,
  getPaymentById,
  verifyPayment,
} from "../controller/paymentController.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";

const PaymentRouter = express.Router();

PaymentRouter.use(verifiveToken, authorizeRoles("customer"));

PaymentRouter.post("/order/:orderId", createPayment);
PaymentRouter.post("/:paymentId/verify", verifyPayment);
PaymentRouter.get("/:paymentId", getPaymentById);

export default PaymentRouter;
