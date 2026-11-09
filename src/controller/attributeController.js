import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Attribute } from "../model/Attribute.js";
import { Subcategory } from "../model/Subcategory.js";
import { applyCreatedAtRange, getCreatedAtRange } from "../utils/dateRange.js";

const ALLOWED_INPUT_TYPES = [
  "text",
  "number",
  "select",
  "multiselect",
  "boolean",
];

function validateOptions(options, inputType) {
  if (!Array.isArray(options)) {
    return { error: "Options must be an array" };
  }

  if (options.some((option) => typeof option !== "string")) {
    return { error: "Every option must be a string" };
  }

  const cleanedOptions = [
    ...new Set(options.map((option) => option.trim()).filter(Boolean)),
  ];

  if (
    ["select", "multiselect"].includes(inputType) &&
    cleanedOptions.length === 0
  ) {
    return {
      error: "Select and multiselect attributes require at least one option",
    };
  }

  return { options: cleanedOptions };
}

function validKey(key) {
  return (
    typeof key === "string" &&
    /^[a-z][a-z0-9_]*$/.test(key.trim().toLowerCase())
  );
}

export const createAttribute = asyncHandler(async (req, res) => {
  const {
    name,
    key,
    subCategory,
    inputType = "text",
    options = [],
    isRequired = false,
    isFilterable = false,
    isVariant = false,
  } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    !validKey(key) ||
    !subCategory
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid name, key and subcategory are required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(subCategory)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subcategory ID",
    });
  }

  if (!ALLOWED_INPUT_TYPES.includes(inputType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute input type",
    });
  }

  for (const value of [isRequired, isFilterable, isVariant]) {
    if (typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Attribute settings must be true or false",
      });
    }
  }

  const optionResult = validateOptions(options, inputType);

  if (optionResult.error) {
    return res.status(400).json({
      success: false,
      message: optionResult.error,
    });
  }

  const subcategory = await Subcategory.findOne({
    _id: subCategory,
    isActive: true,
  });

  if (!subcategory) {
    return res.status(404).json({
      success: false,
      message: "Active subcategory not found",
    });
  }

  const normalizedKey = key.trim().toLowerCase();

  const existing = await Attribute.findOne({
    subCategory,
    key: normalizedKey,
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "This attribute key already exists in this subcategory",
    });
  }

  try {
    const attribute = await Attribute.create({
      name: name.trim(),
      key: normalizedKey,
      subCategory,
      inputType,
      options: optionResult.options,
      isRequired,
      isFilterable,
      isVariant,
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Attribute created successfully",
      data: attribute,
    });
  } catch (error) {
    // Also handles duplicate-key races from the unique database index.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This attribute key already exists in this subcategory",
      });
    }

    throw error;
  }
});

export const getAllAttributes = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const { subCategory, isActive } = req.query;

  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid pagination values",
    });
  }

  const query = {};
  const { range, error } = getCreatedAtRange(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }
  applyCreatedAtRange(query, range);

  if (subCategory) {
    if (!mongoose.Types.ObjectId.isValid(subCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    query.subCategory = subCategory;
  }

  if (isActive !== undefined) {
    if (!["true", "false"].includes(isActive)) {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    query.isActive = isActive === "true";
  }

  const skip = (page - 1) * limit;

  const [attributes, totalDocs] = await Promise.all([
    Attribute.find(query)
      .populate("subCategory", "name category")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Attribute.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    data: attributes,
    pagination: {
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
      hasNextPage: skip + attributes.length < totalDocs,
      hasPrevPage: page > 1,
    },
  });
});

export const getSellerAttributes = asyncHandler(async (req, res) => {
  const { subCategory } = req.query;

  if (
    typeof subCategory !== "string" ||
    !mongoose.Types.ObjectId.isValid(subCategory)
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid subcategory ID is required",
    });
  }

  const subcategory = await Subcategory.findOne({
    _id: subCategory,
    isActive: true,
  }).select("_id");

  if (!subcategory) {
    return res.status(404).json({
      success: false,
      message: "Active subcategory not found",
    });
  }

  const attributes = await Attribute.find({
    subCategory,
    isActive: true,
  })
    .select("name key inputType options isRequired isVariant")
    .sort({ name: 1 });

  return res.status(200).json({
    success: true,
    data: attributes,
  });
});

export const getAttributeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute ID",
    });
  }

  const attribute = await Attribute.findById(id)
    .populate("subCategory", "name category")
    .populate("createdBy", "name");

  if (!attribute) {
    return res.status(404).json({
      success: false,
      message: "Attribute not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: attribute,
  });
});

export const updateAttribute = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute ID",
    });
  }

  const attribute = await Attribute.findById(id);

  if (!attribute) {
    return res.status(404).json({
      success: false,
      message: "Attribute not found",
    });
  }

  const {
    name,
    key,
    subCategory,
    inputType,
    options,
    isRequired,
    isFilterable,
    isVariant,
  } = req.body;

  const nextName = name === undefined ? attribute.name : name;
  const nextKey =
    key === undefined ? attribute.key : key;
  const nextSubCategory =
    subCategory === undefined
      ? attribute.subCategory.toString()
      : subCategory;
  const nextInputType = inputType ?? attribute.inputType;
  const nextOptions = options ?? attribute.options;

  if (typeof nextName !== "string" || !nextName.trim()) {
    return res.status(400).json({
      success: false,
      message: "Attribute name cannot be empty",
    });
  }

  if (!validKey(nextKey)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute key",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(nextSubCategory)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subcategory ID",
    });
  }

  if (!ALLOWED_INPUT_TYPES.includes(nextInputType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute input type",
    });
  }

  for (const value of [isRequired, isFilterable, isVariant]) {
    if (value !== undefined && typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Attribute settings must be true or false",
      });
    }
  }

  const optionResult = validateOptions(nextOptions, nextInputType);

  if (optionResult.error) {
    return res.status(400).json({
      success: false,
      message: optionResult.error,
    });
  }

  const subcategory = await Subcategory.findOne({
    _id: nextSubCategory,
    isActive: true,
  });

  if (!subcategory) {
    return res.status(404).json({
      success: false,
      message: "Active subcategory not found",
    });
  }

  const normalizedKey = nextKey.trim().toLowerCase();

  const duplicate = await Attribute.findOne({
    _id: { $ne: id },
    subCategory: nextSubCategory,
    key: normalizedKey,
  });

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "This attribute key already exists in this subcategory",
    });
  }

  attribute.name = nextName.trim();
  attribute.key = normalizedKey;
  attribute.subCategory = nextSubCategory;
  attribute.inputType = nextInputType;
  attribute.options = optionResult.options;

  if (isRequired !== undefined) attribute.isRequired = isRequired;
  if (isFilterable !== undefined) attribute.isFilterable = isFilterable;
  if (isVariant !== undefined) attribute.isVariant = isVariant;

  try {
    await attribute.save();
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This attribute key already exists in this subcategory",
      });
    }

    throw error;
  }

  return res.status(200).json({
    success: true,
    message: "Attribute updated successfully",
    data: attribute,
  });
});

export const deleteAttribute = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute ID",
    });
  }

  const attribute = await Attribute.findById(id);

  if (!attribute) {
    return res.status(404).json({
      success: false,
      message: "Attribute not found",
    });
  }

  attribute.isActive = false;
  await attribute.save();

  return res.status(200).json({
    success: true,
    message: "Attribute deactivated successfully",
  });
});