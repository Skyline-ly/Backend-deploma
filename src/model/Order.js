import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { ORDER_STATUSES } from "../constants/orderStatus.js";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

   
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    variantAttributes: {
      type: Map,
      of: String,
      default: {},
    },

    image: {
      type: String,
      default: null,
    },

    // Price at purchase time
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryInfo: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
      note: { type: String, trim: true, default: null },
    },

    // Kept for previously placed pickup orders.
    pickupInfo: {
      location: { type: String, trim: true },
      note: { type: String, trim: true, default: null },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["COD"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Cancelled"],
      default: "Pending",
      index: true,
    },

    stockDeducted: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Pending",
      index: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({
  customer: 1,
  createdAt: -1,
});

orderSchema.index({
  status: 1,
  createdAt: -1,
});

orderSchema.plugin(mongoosePaginate);

export const Order = mongoose.model("Order", orderSchema);