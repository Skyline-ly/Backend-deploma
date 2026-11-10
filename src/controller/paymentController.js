import asyncHandler from "express-async-handler";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { Order } from "../model/Order.js";
import { Payment } from "../model/Payment.js";

const PURCHASE_URL =
  "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase";
const CHECK_TRANSACTION_URL =
  "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2";

function utcTimestamp() {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function getCredentials() {
  const merchantId = process.env.PAYWAY_MERCHANT_ID;
  const publicKey = process.env.PAYWAY_PUBLIC_KEY;
  return {
    merchantId,
    publicKey,
    returnUrl: process.env.PAYWAY_RETURN_URL || "",
  };
}

function createHash(value, publicKey) {
  return crypto.createHmac("sha512", publicKey).update(value).digest("base64");
}

export const createPayWayPayment = asyncHandler(async (req, res) => {
  const credentials = getCredentials();
  if (!credentials.merchantId || !credentials.publicKey) {
    return res.status(503).json({
      success: false,
      message: "PayWay credentials are not configured",
    });
  }
  const { merchantId, publicKey, returnUrl } = credentials;

  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  const order = await Order.findOne({
    _id: orderId,
    customer: req.user.userId,
    paymentMethod: "PayWay",
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "PayWay order not found",
    });
  }
  if (order.status === "Cancelled" || order.paymentStatus === "Cancelled") {
    return res.status(409).json({
      success: false,
      message: "This order has been cancelled",
    });
  }
  if (order.paymentStatus === "Paid") {
    return res.status(409).json({
      success: false,
      message: "This order has already been paid",
    });
  }
  if (!Number.isFinite(order.totalAmount) || order.totalAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Order total is not a valid payment amount",
    });
  }

  const payment = await Payment.findOne({
    order: order._id,
    customer: req.user.userId,
    method: "PayWay",
  });
  if (!payment || payment.status !== "Pending") {
    return res.status(409).json({
      success: false,
      message: "This order is not awaiting a PayWay payment",
    });
  }

  if (payment.transactionId && payment.gatewayResponse) {
    return res.status(200).json({
      ...payment.gatewayResponse,
      tran_id: payment.transactionId,
      amount: payment.amount.toFixed(2),
    });
  }

  const tran_id =
    payment.transactionId || `PW${order._id.toString().slice(-18)}`;
  const req_time = Math.floor(Date.now() / 1000).toString();
  const customerName = order.deliveryInfo?.name?.trim() || "Customer";
  const [firstname, ...lastNameParts] = customerName.split(/\s+/);

  const fields = {
    req_time,
    merchant_id: merchantId,
    tran_id,
    amount: order.totalAmount.toFixed(2),
    items: "",
    shipping: "0",
    firstname,
    lastname: lastNameParts.join(" ") || firstname,
    email: order.deliveryInfo?.email || "",
    phone: order.deliveryInfo?.phone || "",
    type: "",
    payment_option: "",
    return_url: returnUrl,
    cancel_url: "",
    continue_success_url: "",
    return_deeplink: "",
    currency: payment.currency,
    custom_fields: "",
    return_params: "",
    payout: "",
    lifetime: "30",
    additional_params: "",
    google_pay_token: "",
    skip_success_page: "0",
  };

  const hash = createHash(Object.values(fields).join(""), publicKey);
  let paywayResponse;
  try {
    paywayResponse = await fetch(PURCHASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...fields, hash }),
    });
  } catch {
    return res.status(502).json({
      success: false,
      message: "Unable to connect to PayWay to create the payment",
    });
  }
  const responseBody = await paywayResponse.text();
  let data;
  try {
    data = JSON.parse(responseBody);
  } catch {
    data = null;
  }

  if (!data || !paywayResponse.ok || data.status?.code !== "00") {
    const gatewayStatus = data?.status;
    return res.status(502).json({
      success: false,
      message:
        gatewayStatus?.message ||
        `PayWay returned HTTP ${paywayResponse.status} without a successful payment response`,
      gatewayCode: gatewayStatus?.code || null,
      gatewayHttpStatus: paywayResponse.status,
    });
  }

  payment.transactionId = tran_id;
  payment.amount = order.totalAmount;
  payment.gateway = "ABA PayWay";
  payment.qrImage = data.qrImage || "";
  payment.abaPaywayDeeplink = data.abapay_deeplink || "";
  payment.gatewayResponse = data;
  await payment.save();

  return res.status(200).json({
    ...data,
    tran_id,
    amount: order.totalAmount.toFixed(2),
  });
});

export const checkPayWayPaymentStatus = asyncHandler(async (req, res) => {
  const credentials = getCredentials();
  if (!credentials.merchantId || !credentials.publicKey) {
    return res.status(503).json({
      success: false,
      message: "PayWay credentials are not configured",
    });
  }
  const { merchantId, publicKey } = credentials;

  const { tran_id } = req.body;
  if (typeof tran_id !== "string" || !tran_id.trim()) {
    return res.status(400).json({
      success: false,
      message: "A transaction ID is required",
    });
  }

  const payment = await Payment.findOne({
    transactionId: tran_id.trim(),
    customer: req.user.userId,
    method: "PayWay",
  });
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment transaction not found",
    });
  }

  if (payment.status !== "Pending") {
    return res.status(200).json({
      status: { code: "00" },
      data: { payment_status: payment.status.toUpperCase() },
      paymentRecordStatus: payment.status,
    });
  }

  const req_time = utcTimestamp();
  const hash = createHash(
    `${req_time}${merchantId}${payment.transactionId}`,
    publicKey
  );
  let paywayResponse;
  try {
    paywayResponse = await fetch(CHECK_TRANSACTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        req_time,
        merchant_id: merchantId,
        tran_id: payment.transactionId,
        hash,
      }),
    });
  } catch {
    return res.status(502).json({
      success: false,
      message: "Unable to connect to PayWay to check payment status",
    });
  }
  const responseBody = await paywayResponse.text();
  let data;
  try {
    data = JSON.parse(responseBody);
  } catch {
    data = null;
  }

  if (!data || !paywayResponse.ok || data.status?.code !== "00") {
    const gatewayStatus = data?.status;
    return res.status(502).json({
      success: false,
      message:
        gatewayStatus?.message ||
        `PayWay returned HTTP ${paywayResponse.status} without a successful status response`,
      gatewayCode: gatewayStatus?.code || null,
      gatewayHttpStatus: paywayResponse.status,
    });
  }

  const gatewayStatus = String(data.data?.payment_status || "").toUpperCase();
  const paidStatuses = new Set(["APPROVED", "SUCCESS", "PAID", "COMPLETED"]);
  const failedStatuses = new Set(["FAILED", "DECLINED", "CANCELLED", "EXPIRED"]);

  if (paidStatuses.has(gatewayStatus) && payment.status === "Pending") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Payment.updateOne(
          { _id: payment._id, status: "Pending" },
          { $set: { status: "Paid", paidAt: new Date() } },
          { session }
        );
        await Order.updateOne(
          { _id: payment.order, paymentStatus: "Pending" },
          { $set: { paymentStatus: "Paid" } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
  } else if (failedStatuses.has(gatewayStatus) && payment.status === "Pending") {
    const failedStatus = gatewayStatus === "CANCELLED" ? "Cancelled" : "Failed";
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Payment.updateOne(
          { _id: payment._id, status: "Pending" },
          { $set: { status: failedStatus } },
          { session }
        );
        await Order.updateOne(
          { _id: payment.order, paymentStatus: "Pending" },
          { $set: { paymentStatus: failedStatus } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
  }

  return res.status(200).json({
    ...data,
    paymentRecordStatus: paidStatuses.has(gatewayStatus)
      ? "Paid"
      : failedStatuses.has(gatewayStatus)
        ? gatewayStatus === "CANCELLED" ? "Cancelled" : "Failed"
        : payment.status,
  });
});
