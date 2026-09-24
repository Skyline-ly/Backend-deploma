
import express from "express";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  getSellerOrders,
  updateOrderStatus,
  cancelOrder,
} from "../controller/orderContoller.js";
import { verifiveToken } from "../middlewar/verifyToken.js";
import { authorizeRoles } from "../middlewar/catchByRole.js";



const orderRoute = express.Router();

orderRoute.post(
  "/",
  verifiveToken,
  authorizeRoles("customer"),
  createOrder
);

orderRoute.get(
  "/my",
  verifiveToken,
  authorizeRoles("customer"),
  getMyOrders
);

orderRoute.patch(
  "/:id/cancel",
  verifiveToken,
  authorizeRoles("customer"),
  cancelOrder
);


orderRoute.get(
  "/seller",
  verifiveToken,
  authorizeRoles("seller"),
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
  updateOrderStatus
);

export default orderRoute;