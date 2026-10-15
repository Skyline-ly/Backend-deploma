
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["USD", "KHR"],
      default: "USD",
      required: true,
    },

    method: {
      type: String,
      enum: ["KHQR"],
      default: "KHQR",
      required: true,
    },

    gateway: {
      type: String,
      default: "Bakong",
    },

    qrString: {
      type: String,
      default: null,
      select: false,
    },

  
    paymentHash: {
      type: String,
      default: null,
      select: false,
    },

    transactionId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Paid",
        "Failed",
        "Expired",
        "Refunded",
      ],
      default: "Pending",
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


paymentSchema.index({ customer: 1, createdAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
