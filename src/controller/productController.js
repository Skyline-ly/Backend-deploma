import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Product } from "../model/Product.js";

function parseJsonField(value, fieldName, fallback) {
  if (value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    const error = new Error(`${fieldName} must contain valid JSON`);
    error.statusCode = 400;
    throw error;
  }
}

function uploadedProductImages(files = []) {
  return files.map((file) => ({
    url: file.path,
    publicId: file.filename,
  }));
}

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    basePrice,
    discountPrice,
    stock,
    category,
    subCategory,
    brand,
    attributes: attributesInput,
    variants: variantsInput,
    images: imagesInput,
    condition,
  } = req.body;
  let attributes;
  let variants;
  let images;

  try {
    attributes = parseJsonField(attributesInput, "Attributes", {});
    variants = parseJsonField(variantsInput, "Variants", []);
    images = parseJsonField(imagesInput, "Images", []);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (
    !name ||
    !description ||
    basePrice === undefined ||
    !category ||
    !subCategory
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Name, description, base price, category and subcategory are required",
    });
  }

  if (Number(basePrice) < 0) {
    return res.status(400).json({
      success: false,
      message: "Base price cannot be negative",
    });
  }

  if (
    stock !== undefined &&
    (!Number.isInteger(Number(stock)) || Number(stock) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Stock must be a non-negative integer",
    });
  }

  if (
    discountPrice !== undefined &&
    discountPrice !== null &&
    Number(discountPrice) < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Discount price cannot be negative",
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(category) ||
    !mongoose.Types.ObjectId.isValid(subCategory)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid category or subcategory ID",
    });
  }

  if (brand && !mongoose.Types.ObjectId.isValid(brand)) {
    return res.status(400).json({
      success: false,
      message: "Invalid brand ID",
    });
  }

  const product = await Product.create({
    name: name.trim(),
    description: description.trim(),
    basePrice: Number(basePrice),
    discountPrice:
      discountPrice !== undefined && discountPrice !== null
        ? Number(discountPrice)
        : undefined,
    stock: stock !== undefined ? Number(stock) : 0,
    category,
    subCategory,
    brand: brand || null,
    attributes: attributes || {},
    variants: variants || [],
    images: [...(Array.isArray(images) ? images : []), ...uploadedProductImages(req.files)],
    condition: condition || "new",
    seller: req.user.userId,
    approvalStatus: "pending",
  });

  return res.status(201).json({
    success: true,
    message: "Product submitted for admin approval",
    data: product,
  });
});

export const getMyProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const products = await Product.paginate(
    { seller: req.user.userId, isActive: true },
    {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 },
    }
  );

  return res.status(200).json({
    success: true,
    data: products.docs,
    pagination: {
      totalDocs: products.totalDocs,
      totalPages: products.totalPages,
      page: products.page,
      limit: products.limit,
      hasNextPage: products.hasNextPage,
      hasPrevPage: products.hasPrevPage,
    },
  });
});

export const getPendingProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const products = await Product.paginate(
    { approvalStatus: "pending", isActive: true },
    {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: 1 },
      populate: [
        { path: "seller", select: "name email" },
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
        { path: "brand", select: "name" },
      ],
    }
  );

  return res.status(200).json({
    success: true,
    data: products.docs,
    pagination: {
      totalDocs: products.totalDocs,
      totalPages: products.totalPages,
      page: products.page,
      limit: products.limit,
      hasNextPage: products.hasNextPage,
      hasPrevPage: products.hasPrevPage,
    },
  });
});

export const reviewProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reviewNote = "" } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Review status must be approved or rejected",
    });
  }

  if (typeof reviewNote !== "string") {
    return res.status(400).json({
      success: false,
      message: "Review note must be a string",
    });
  }

  const product = await Product.findOneAndUpdate(
    { _id: id, approvalStatus: "pending", isActive: true },
    {
      $set: {
        approvalStatus: status,
        reviewNote: reviewNote.trim(),
      },
    },
    { new: true, runValidators: true }
  );

  if (!product) {
    const existingProduct = await Product.findById(id).select("_id");
    return res.status(existingProduct ? 409 : 404).json({
      success: false,
      message: existingProduct
        ? "Product is not awaiting review"
        : "Product not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: `Product ${status} successfully`,
    data: product,
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const product = await Product.findOne({
    _id: id,
    isActive: true,
    approvalStatus: { $in: ["approved", null] },
  })
    .populate("category", "name")
    .populate("subCategory", "name")
    .populate("brand", "name")
    .populate("seller", "name avatar");

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: product,
  });
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    subCategory,
    brand,
    condition,
    minPrice,
    maxPrice,
    sort,
  } = req.query;

  const query = {
    isActive: true,
    approvalStatus: { $in: ["approved", null] },
  };

  if (search && search.trim()) {
    query.$or = [
      {
        name: {
          $regex: search.trim(),
          $options: "i",
        },
      },
      {
        description: {
          $regex: search.trim(),
          $options: "i",
        },
      },
    ];
  }

  if (category) {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    query.category = category;
  }

  if (subCategory) {
    if (!mongoose.Types.ObjectId.isValid(subCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    query.subCategory = subCategory;
  }

  if (brand) {
    if (!mongoose.Types.ObjectId.isValid(brand)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    query.brand = brand;
  }

  if (condition) {
    query.condition = condition;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.basePrice = {};

    if (minPrice !== undefined) {
      query.basePrice.$gte = Number(minPrice);
    }

    if (maxPrice !== undefined) {
      query.basePrice.$lte = Number(maxPrice);
    }
  }

  let sortOption = {
    createdAt: -1,
  };

  if (sort === "price_asc") {
    sortOption = {
      basePrice: 1,
    };
  }

  if (sort === "price_desc") {
    sortOption = {
      basePrice: -1,
    };
  }

  if (sort === "newest") {
    sortOption = {
      createdAt: -1,
    };
  }

  const products = await Product.paginate(query, {
    page: Number(page),
    limit: Number(limit),
    sort: sortOption,
    populate: [
      {
        path: "category",
        select: "name",
      },
      {
        path: "subCategory",
        select: "name",
      },
      {
        path: "brand",
        select: "name",
      },
      {
        path: "seller",
        select: "name",
      },
    ],
  });

  return res.status(200).json({
    success: true,
    data: products.docs,
    pagination: {
      totalDocs: products.totalDocs,
      totalPages: products.totalPages,
      page: products.page,
      limit: products.limit,
      hasNextPage: products.hasNextPage,
      hasPrevPage: products.hasPrevPage,
    },
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    name,
    description,
    basePrice,
    discountPrice,
    stock,
    category,
    subCategory,
    brand,
    attributes: attributesInput,
    variants: variantsInput,
    images: imagesInput,
    condition,
  } = req.body;
  let attributes;
  let variants;
  let images;

  try {
    attributes = parseJsonField(attributesInput, "Attributes", undefined);
    variants = parseJsonField(variantsInput, "Variants", undefined);
    images = parseJsonField(imagesInput, "Images", undefined);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const product = await Product.findById(id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  if (product.seller.toString() !== req.user.userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to update this product",
    });
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot be empty",
      });
    }

    product.name = name.trim();
  }

  if (description !== undefined) {
    product.description = description.trim();
  }

  if (basePrice !== undefined) {
    if (Number(basePrice) < 0) {
      return res.status(400).json({
        success: false,
        message: "Base price cannot be negative",
      });
    }

    product.basePrice = Number(basePrice);
  }

  if (discountPrice !== undefined) {
    product.discountPrice =
      discountPrice === null ? null : Number(discountPrice);
  }

  if (stock !== undefined) {
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative integer",
      });
    }

    product.stock = Number(stock);
  }

  if (category !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    product.category = category;
  }

  if (subCategory !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(subCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    product.subCategory = subCategory;
  }

  if (brand !== undefined) {
    if (brand !== null && !mongoose.Types.ObjectId.isValid(brand)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    product.brand = brand;
  }

  if (attributes !== undefined) {
    product.attributes = attributes;
  }

  if (variants !== undefined) {
    product.variants = variants;
  }

  if (images !== undefined) {
    product.images = images;
  }

  if (req.files?.length) {
    product.images.push(...uploadedProductImages(req.files));
  }

  if (condition !== undefined) {
    product.condition = condition;
  }

  product.approvalStatus = "pending";
  product.reviewNote = "";

  await product.save();

  return res.status(200).json({
    success: true,
    message: "Product updated and awaiting admin approval",
    data: product,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const product = await Product.findById(id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  if (product.seller.toString() !== req.user.userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to delete this product",
    });
  }

  product.isActive = false;

  await product.save();

  return res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});