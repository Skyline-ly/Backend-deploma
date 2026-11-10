import express from "express";
import {
  checkPayWayPaymentStatus,
  createPayWayPayment,
} from "../controller/paymentController.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";

const paymentRouter = express.Router();
const allowCheckoutRoles = [verifiveToken, authorizeRoles("customer", "seller")];

paymentRouter.post(
  "/orders/:orderId/payway",
  ...allowCheckoutRoles,
  createPayWayPayment
);
paymentRouter.post(
  "/check-status",
  ...allowCheckoutRoles,
  checkPayWayPaymentStatus
);

export default paymentRouter;
