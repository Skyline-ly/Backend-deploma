import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Product } from "../model/Product.js";
import { Attribute } from "../model/Attribute.js";
import { Subcategory } from "../model/Subcategory.js";
import { User } from "../model/User.js";

async function getApprovedSellerIds() {
  return User.distinct("_id", {
    role: "seller",
    sellerStatus: "approved",
    isActive: true,
  });
}

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

function plainObject(value) {
  return value instanceof Map ? Object.fromEntries(value) : value;
}

function normalizeAttributeValues(input, definitions, isVariant) {
  const values = plainObject(input);
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return { error: "Product attributes must be an object" };
  }

  const allDefinitionsByIdentifier = new Map();
  for (const definition of definitions) {
    for (const identifier of [definition.key, definition.name, definition._id?.toString()]) {
      if (identifier) {
        allDefinitionsByIdentifier.set(identifier.trim().toLowerCase(), definition);
      }
    }
  }
  const relevantDefinitions = definitions.filter(
    (definition) => definition.isVariant === isVariant
  );
  const definitionsByIdentifier = new Map();
  for (const definition of relevantDefinitions) {
    for (const identifier of [definition.key, definition.name, definition._id?.toString()]) {
      if (identifier) {
        definitionsByIdentifier.set(identifier.trim().toLowerCase(), definition);
      }
    }
  }
  const normalized = {};

  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = key.trim().toLowerCase();
    const definition = definitionsByIdentifier.get(normalizedKey);
    if (!definition) {
      const existingDefinition = allDefinitionsByIdentifier.get(normalizedKey);
      if (existingDefinition) {
        return {
          error: `${existingDefinition.name} is not configured as a variant attribute for this subcategory`,
        };
      }
      return { error: `Unknown ${isVariant ? "variant " : ""}attribute: ${key}` };
    }

    if (definition.inputType === "multiselect") {
      const selectedValues = Array.isArray(value)
        ? value
        : typeof value === "string" && value
          ? value.split(",").map((item) => item.trim())
          : [];
      if (selectedValues.some((item) => typeof item !== "string")) {
        return { error: `${definition.name} must contain valid options` };
      }
      const cleanedValues = [...new Set(selectedValues.map((item) => item.trim()).filter(Boolean))];
      if (
        cleanedValues.some((item) => !definition.options.includes(item)) ||
        (isVariant && cleanedValues.length > 1)
      ) {
        return {
          error: `${definition.name} contains an invalid option`,
        };
      }
      if (cleanedValues.length) normalized[definition.key] = cleanedValues.join(", ");
      continue;
    }

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      return { error: `${definition.name} must be a single value` };
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) continue;

    if (
      definition.inputType === "select" &&
      !definition.options.includes(normalizedValue)
    ) {
      return { error: `${definition.name} contains an invalid option` };
    }
    if (
      definition.inputType === "boolean" &&
      !["true", "false"].includes(normalizedValue)
    ) {
      return { error: `${definition.name} must be yes or no` };
    }
    if (
      definition.inputType === "number" &&
      !Number.isFinite(Number(normalizedValue))
    ) {
      return { error: `${definition.name} must be a valid number` };
    }

    normalized[definition.key] = normalizedValue;
  }

  for (const definition of relevantDefinitions) {
    const value = normalized[definition.key];
    if ((isVariant || definition.isRequired) && !value) {
      return { error: `${definition.name} is required` };
    }
  }

  return { values: normalized };
}

async function normalizeProductConfiguration(subCategory, attributes, variants) {
  const definitions = await Attribute.find({
    subCategory,
    isActive: true,
  }).select("name key inputType options isRequired isVariant");
  const normalizedAttributes = normalizeAttributeValues(
    attributes,
    definitions,
    false
  );
  if (normalizedAttributes.error) return normalizedAttributes;

  if (!Array.isArray(variants)) {
    return { error: "Variants must be an array" };
  }

  const variantDefinitions = definitions.filter(
    (definition) => definition.isVariant
  );
  if (variantDefinitions.length && !variants.length) {
    return { error: "Add at least one product variant" };
  }
  if (!variantDefinitions.length && variants.length) {
    return { error: "This subcategory does not have variant attributes" };
  }

  const seenSkus = new Set();
  const seenCombinations = new Set();
  const normalizedVariants = [];
  for (const variant of variants) {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      return { error: "Each variant must be an object" };
    }

    const normalizedVariantAttributes = normalizeAttributeValues(
      variant.attributes || {},
      definitions,
      true
    );
    if (normalizedVariantAttributes.error) {
      return normalizedVariantAttributes;
    }

    const price = Number(variant.price);
    const stock = Number(variant.stock);
    const sku = typeof variant.sku === "string" ? variant.sku.trim() : "";
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Each variant needs a non-negative price" };
    }
    if (!Number.isSafeInteger(stock) || stock < 0) {
      return { error: "Each variant needs a non-negative whole-number stock" };
    }
    if (!sku) return { error: "Each variant needs a SKU" };
    const normalizedSku = sku.toLowerCase();
    if (seenSkus.has(normalizedSku)) {
      return { error: "Variant SKUs must be unique" };
    }
    seenSkus.add(normalizedSku);

    const combination = JSON.stringify(
      Object.entries(normalizedVariantAttributes.values).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    );
    if (seenCombinations.has(combination)) {
      return { error: "Each variant must have a unique attribute combination" };
    }
    seenCombinations.add(combination);

    const normalizedVariant = {
      attributes: normalizedVariantAttributes.values,
      price,
      stock,
      sku,
    };
    if (variant.discountPrice !== "" && variant.discountPrice !== undefined) {
      const discountPrice = Number(variant.discountPrice);
      if (!Number.isFinite(discountPrice) || discountPrice < 0) {
        return { error: "Variant discount prices cannot be negative" };
      }
      normalizedVariant.discountPrice = discountPrice;
    }
    normalizedVariants.push(normalizedVariant);
  }

  return {
    attributes: normalizedAttributes.values,
    variants: normalizedVariants,
  };
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
    condition,
  } = req.body;
  let attributes;
  let variants;

  try {
    attributes = parseJsonField(attributesInput, "Attributes", {});
    variants = parseJsonField(variantsInput, "Variants", []);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (req.body.images !== undefined) {
    return res.status(400).json({
      success: false,
      message: "Upload product images as files using the images field",
    });
  }

  if (!req.files?.length) {
    return res.status(400).json({
      success: false,
      message: "At least one product image file is required",
    });
  }

  const includesVariants = Array.isArray(variants) && variants.length > 0;
  if (
    !name ||
    !description ||
    (!includesVariants && basePrice === undefined) ||
    !category ||
    !subCategory
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Name, description, price, category and subcategory are required",
    });
  }

  if (
    !includesVariants &&
    (!Number.isFinite(Number(basePrice)) || Number(basePrice) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Base price must be a non-negative number",
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

  const subcategory = await Subcategory.findOne({
    _id: subCategory,
    category,
    isActive: true,
  }).select("_id");
  if (!subcategory) {
    return res.status(400).json({
      success: false,
      message: "Choose an active subcategory in the selected category",
    });
  }

  const configuration = await normalizeProductConfiguration(
    subCategory,
    attributes,
    variants
  );
  if (configuration.error) {
    return res.status(400).json({
      success: false,
      message: configuration.error,
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
    basePrice: configuration.variants.length
      ? Math.min(...configuration.variants.map((variant) => variant.price))
      : Number(basePrice),
    discountPrice: !configuration.variants.length &&
      discountPrice !== undefined && discountPrice !== null
        ? Number(discountPrice)
        : undefined,
    stock: stock !== undefined ? Number(stock) : 0,
    category,
    subCategory,
    brand: brand || null,
    attributes: configuration.attributes,
    variants: configuration.variants,
    images: uploadedProductImages(req.files),
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
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Page must be positive and limit must be between 1 and 100",
    });
  }

  const query = {
    seller: req.user.userId,
    isActive: true,
  };
  const { fromDate, toDate } = req.query;

  if (fromDate || toDate) {
    const dateRange = {};
    const parseDate = (value) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
      }

      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return null;
      }

      return date;
    };

    if (fromDate) {
      const startDate = parseDate(fromDate);
      if (!startDate) {
        return res.status(400).json({
          success: false,
          message: "fromDate must be a valid date in YYYY-MM-DD format",
        });
      }
      dateRange.$gte = startDate;
    }

    if (toDate) {
      const endDate = parseDate(toDate);
      if (!endDate) {
        return res.status(400).json({
          success: false,
          message: "toDate must be a valid date in YYYY-MM-DD format",
        });
      }
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      dateRange.$lt = endDate;
    }

    if (
      dateRange.$gte &&
      dateRange.$lt &&
      dateRange.$gte >= dateRange.$lt
    ) {
      return res.status(400).json({
        success: false,
        message: "fromDate must be on or before toDate",
      });
    }

    query.createdAt = dateRange;
  }

  const products = await Product.paginate(
    query,
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

export const getAdminProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const query = {};

  if (typeof req.query.search === "string" && req.query.search.trim()) {
    query.name = { $regex: req.query.search.trim(), $options: "i" };
  }
  if (typeof req.query.status === "string" && req.query.status) {
    query.approvalStatus = req.query.status;
  }

  const products = await Product.paginate(query, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: [
      { path: "seller", select: "name email" },
      { path: "category", select: "name" },
      { path: "subCategory", select: "name" },
      { path: "brand", select: "name" },
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

  const approvedSellerIds = await getApprovedSellerIds();
  const product = await Product.findOne({
    _id: id,
    isActive: true,
    approvalStatus: { $in: ["approved", null] },
    seller: { $in: approvedSellerIds },
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
    seller: { $in: await getApprovedSellerIds() },
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
    condition,
  } = req.body;
  let attributes;
  let variants;

  try {
    attributes = parseJsonField(attributesInput, "Attributes", undefined);
    variants = parseJsonField(variantsInput, "Variants", undefined);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (req.body.images !== undefined) {
    return res.status(400).json({
      success: false,
      message: "Upload product images as files using the images field",
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

  if (category !== undefined || subCategory !== undefined) {
    const subcategory = await Subcategory.findOne({
      _id: product.subCategory,
      category: product.category,
      isActive: true,
    }).select("_id");
    if (!subcategory) {
      return res.status(400).json({
        success: false,
        message: "Choose an active subcategory in the selected category",
      });
    }
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

  if (attributes !== undefined || variants !== undefined) {
    const configuration = await normalizeProductConfiguration(
      product.subCategory,
      attributes === undefined ? plainObject(product.attributes) : attributes,
      variants === undefined
        ? product.variants.map((variant) => ({
            ...variant.toObject(),
            attributes: plainObject(variant.attributes),
          }))
        : variants
    );
    if (configuration.error) {
      return res.status(400).json({
        success: false,
        message: configuration.error,
      });
    }
    product.attributes = configuration.attributes;
    product.variants = configuration.variants;
    if (configuration.variants.length) {
      product.basePrice = Math.min(
        ...configuration.variants.map((variant) => variant.price)
      );
      product.discountPrice = undefined;
    }
  }

  if (req.files?.length) {
    product.images = uploadedProductImages(req.files);
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