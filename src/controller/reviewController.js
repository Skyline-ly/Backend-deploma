import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Review } from "../model/Review.js";
import { Order } from "../model/Order.js";
import { Product } from "../model/Product.js";

export const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment = "" } = req.body;
  const customerId = req.user.userId;

  if (
    !mongoose.isValidObjectId(productId) ||
    !mongoose.isValidObjectId(orderId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid product or order ID",
    });
  }

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return res.status(400).json({
      success: false,
      message: "Rating must be a whole number from 1 to 5",
    });
  }

  if (typeof comment !== "string" || comment.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Comment must be 1000 characters or fewer",
    });
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const order = await Order.findOne({
    _id: orderId,
    customer: customerId,
    status: "Completed",
    "items.product": productId,
  });

  if (!order) {
    return res.status(403).json({
      success: false,
      message: "You can review a product only after completing its order",
    });
  }

  const existingReview = await Review.findOne({
    product: productId,
    customer: customerId,
  });

  if (existingReview) {
    return res.status(409).json({
      success: false,
      message: "You have already reviewed this product",
    });
  }

  const review = await Review.create({
    product: productId,
    customer: customerId,
    order: orderId,
    rating,
    comment: comment.trim(),
  });

  const populatedReview = await Review.findById(review._id)
    .populate("customer", "name avatar");

  return res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    data: populatedReview,
  });
});

export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(
    50,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  const [reviews, total, summary] = await Promise.all([
    Review.find({ product: productId })
      .populate("customer", "name avatar")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),

    Review.countDocuments({ product: productId }),

    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]),
  ]);

  const ratingSummary = summary[0] ?? {
    averageRating: 0,
    totalReviews: 0,
  };

  return res.status(200).json({
    success: true,
    data: reviews,
    summary: {
      averageRating: Number(ratingSummary.averageRating.toFixed(1)),
      totalReviews: ratingSummary.totalReviews,
    },
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

export const deleteMyReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.isValidObjectId(reviewId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid review ID",
    });
  }

  const review = await Review.findOneAndDelete({
    _id: reviewId,
    customer: req.user.userId,
  });

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});