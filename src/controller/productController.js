import asyncHandler from "../middleware/asyncHandler.js";
import { Product } from "../model/Product.js";

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    basePrice,
    category,
    subCategory,
    brand,
    attributes,
    variants,
    images,
    condition,
  } = req.body;

  if (!name ||basePrice === undefined ||!category ||!subCategory) {
    return res.status(400).json({
      success: false,
      message:
        "All field are required",
    });
  }


  const product = await Product.create({
    name: name.trim(),
    description,
    basePrice,
    category,
    subCategory,
    brand,
    attributes,
    variants,
    images,
    condition,
    seller: req.user.userId,
  });

  return res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});