
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
      enum: ["COD", "PayWay"],
      default: "COD",
      required: true,
    },

    gateway: {
      type: String,
      default: "Cash on Delivery",
    },

    qrImage: {
      type: String,
      default: "",
    },

    abaPaywayDeeplink: {
      type: String,
      default: "",
    },

    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    paidAt: {
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
