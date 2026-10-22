import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number from 1 to 5",
      },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true }
);

reviewSchema.index(
  { product: 1, customer: 1 },
  { unique: true }
);

export const Review = mongoose.model("Review", reviewSchema);