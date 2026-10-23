import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Product } from "../model/Product.js";
import { Wishlist } from "../model/WishList.js";

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({
    customer: req.user.userId,
  }).populate({
    path: "products",
    match: {
      isActive: true,
      approvalStatus: { $in: ["approved", null] },
    },
    select: "name basePrice discountPrice images stock variants condition seller",
  });

  return res.status(200).json({
    success: true,
    data: wishlist?.products ?? [],
  });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    approvalStatus: { $in: ["approved", null] },
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { customer: req.user.userId },
    { $addToSet: { products: product._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("products");

  return res.status(200).json({
    success: true,
    message: "Product added to wishlist",
    data: wishlist.products,
  });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { customer: req.user.userId },
    { $pull: { products: productId } },
    { new: true }
  );

  return res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
    data: wishlist?.products ?? [],
  });
});