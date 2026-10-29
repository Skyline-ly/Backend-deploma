
import express from "express";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  getSellerOrders,
  getSellerSales,
  updateOrderStatus,
  cancelOrder,
  confirmOrderReceived,
} from "../controller/orderContoller.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
import { requireApprovedSeller } from "../middleware/requireApprovedSeller.js";



const orderRoute = express.Router();

orderRoute.post(
  "/",
  verifiveToken,
  authorizeRoles("customer", "seller"),
  createOrder
);

orderRoute.get(
  "/my",
  verifiveToken,
  authorizeRoles("customer", "seller"),
  getMyOrders
);

orderRoute.patch(
  "/:id/cancel",
  verifiveToken,
  authorizeRoles("customer", "seller"),
  cancelOrder
);

orderRoute.patch(
  "/:id/confirm-received",
  verifiveToken,
  authorizeRoles("customer", "seller"),
  confirmOrderReceived
);


orderRoute.get(
  "/seller/sales",
  verifiveToken,
  authorizeRoles("seller"),
  requireApprovedSeller,
  getSellerSales
);

orderRoute.get(
  "/seller",
  verifiveToken,
  authorizeRoles("seller"),
  requireApprovedSeller,
  getSellerOrders
);


orderRoute.get(
  "/:id",
  verifiveToken,
  authorizeRoles("customer", "seller", "admin"),
  getOrderById
);


orderRoute.patch(
  "/:id/status",
  verifiveToken,
  authorizeRoles("seller", "admin"),
  requireApprovedSeller,
  updateOrderStatus
);

export default orderRoute;