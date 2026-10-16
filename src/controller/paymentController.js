
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Payment } from "../model/Payment.js";
import { Order } from "../model/Order.js";
import {
    generateKhqr,
    checkBakongPayment,
} from "../services/bakongService.js";



export const createPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const customerId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order ID",
        });
    }

    const order = await Order.findOne({
        _id: orderId,
        customer: customerId,
    });

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Order not found",
        });
    }

    if (order.status !== "Pending") {
        return res.status(400).json({
            success: false,
            message: "This order cannot be paid",
        });
    }


    const paidPayment = await Payment.findOne({
        order: order._id,
        status: "Paid",
    });

    if (paidPayment) {
        return res.status(409).json({
            success: false,
            message: "This order has already been paid",
        });
    }


    const pendingPayment = await Payment.findOne({
        order: order._id,
        customer: customerId,
        status: "Pending",
        expiresAt: { $gt: new Date() },
    });

    if (pendingPayment) {
        const paymentWithQr = await Payment.findById(
            pendingPayment._id
        ).select("+qrString +paymentHash");

        return res.status(200).json({
            success: true,
            message: "Existing payment retrieved",
            data: {
                paymentId: paymentWithQr._id,
                orderId: order._id,
                amount: paymentWithQr.amount,
                currency: paymentWithQr.currency,
                status: paymentWithQr.status,
                qrString: paymentWithQr.qrString,
                paymentHash: paymentWithQr.paymentHash,
                expiresAt: paymentWithQr.expiresAt,
            },
        });
    }


    const amount = order.totalAmount;
    const currency = "USD";


    const qr = await generateKhqr({
        amount,
        currency,
        orderId: order._id.toString(),
    });

    if (!qr?.qrString || !qr?.paymentHash) {
        return res.status(502).json({
            success: false,
            message: "Could not generate a payment QR code",
        });
    }

    const payment = await Payment.create({
        order: order._id,
        customer: customerId,
        amount,
        currency,
        qrString: qr.qrString,
        paymentHash: qr.paymentHash,
        status: "Pending",
        expiresAt: qr.expiresAt || null,
    });

    return res.status(201).json({
        success: true,
        message: "Payment created. Scan the KHQR code to pay.",
        data: {
            paymentId: payment._id,
            orderId: order._id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            qrString: qr.qrString,
            expiresAt: payment.expiresAt,
        },
    });
});


export const verifyPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const customerId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment ID",
        });
    }

    const payment = await Payment.findOne({
        _id: paymentId,
        customer: customerId,
    }).select("+paymentHash");

    if (!payment) {
        return res.status(404).json({
            success: false,
            message: "Payment not found",
        });
    }

    if (payment.status === "Paid") {
        return res.status(200).json({
            success: true,
            message: "Payment has already been confirmed",
            data: {
                status: payment.status,
                orderId: payment.order,
            },
        });
    }

    if (["Expired", "Failed", "Refunded"].includes(payment.status)) {
        return res.status(400).json({
            success: false,
            message: `Payment is ${payment.status.toLowerCase()}`,
        });
    }

    if (
        payment.expiresAt &&
        payment.expiresAt <= new Date()
    ) {
        payment.status = "Expired";
        await payment.save();

        return res.status(200).json({
            success: true,
            message: "Payment has expired",
            data: { status: payment.status },
        });
    }

    const result = await checkBakongPayment({
        paymentHash: payment.paymentHash,
    });

    if (!result?.paid) {
        return res.status(200).json({
            success: true,
            message: "Payment has not been confirmed yet",
            data: { status: payment.status },
        });
    }

    if (
        Number(result.amount) !== payment.amount ||
        result.currency !== payment.currency
    ) {
        return res.status(409).json({
            success: false,
            message: "Verified transaction does not match this payment",
        });
    }
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
     
            const currentPayment = await Payment.findById(
                payment._id
            ).session(session);

            if (currentPayment.status === "Paid") {
                return;
            }

            const currentOrder = await Order.findById(
                currentPayment.order
            ).session(session);

            if (!currentOrder) {
                throw new Error("Order not found");
            }

            if (currentOrder.status !== "Pending") {
                throw new Error(
                    "Order is not in a payable state"
                );
            }

            // Ensure a different payment attempt has not paid the order.
            const otherPaidPayment = await Payment.findOne({
                order: currentOrder._id,
                status: "Paid",
                _id: { $ne: currentPayment._id },
            }).session(session);

            if (otherPaidPayment) {
                throw new Error(
                    "Another payment has already paid this order"
                );
            }

            currentPayment.status = "Paid";
            currentPayment.transactionId =
                result.transactionId || null;
            currentPayment.paidAt = new Date();

            currentOrder.status = "Paid";

            await currentPayment.save({ session });
            await currentOrder.save({ session });
        });
    } finally {
        await session.endSession();
    }

    return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: {
            paymentId: payment._id,
            orderId: payment.order,
            status: "Paid",
        },
    });
});


export const getPaymentById = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment ID",
        });
    }

    const payment = await Payment.findOne({
        _id: paymentId,
        customer: req.user.userId,
    }).select("-qrString -paymentHash");

    if (!payment) {
        return res.status(404).json({
            success: false,
            message: "Payment not found",
        });
    }

    return res.status(200).json({
        success: true,
        data: payment,
    });
});

