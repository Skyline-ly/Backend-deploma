import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);
cartItemSchema.index(
    {
        name: 1,
        product: 1,
        variantId: 1,
        customer: 1,
    },
    {
        unique: true,
    }
);

export const Cart = mongoose.model("Cart", cartSchema);