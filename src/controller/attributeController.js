
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Attribute } from "../model/Attribute.js";
import { Subcategory } from "../model/Subcategory.js";



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

  if (!name?.trim() || !key?.trim() || !subCategory) {
    return res.status(400).json({
      success: false,
      message: "Name, key and subcategory are required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(subCategory)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subcategory ID",
    });
  }

  const allowedInputTypes = [
    "text",
    "number",
    "select",
    "multiselect",
    "boolean",
  ];

  if (!allowedInputTypes.includes(inputType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute input type",
    });
  }

  if (!Array.isArray(options)) {
    return res.status(400).json({
      success: false,
      message: "Options must be an array",
    });
  }

  if (
    ["select", "multiselect"].includes(inputType) &&
    options.filter((option) => typeof option === "string" && option.trim()).length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Select and multiselect attributes require options",
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

  
  if (!/^[a-z][a-z0-9_]*$/.test(normalizedKey)) {
    return res.status(400).json({
      success: false,
      message:
        "Key must start with a letter and contain only lowercase letters, numbers or underscores",
    });
  }


  const existingAttribute = await Attribute.findOne({
    subCategory,
    key: normalizedKey,
  });

  if (existingAttribute) {
    return res.status(409).json({
      success: false,
      message: "This attribute key already exists in this subcategory",
    });
  }

  const attribute = await Attribute.create({
    name: name.trim(),
    key: normalizedKey,
    subCategory,
    inputType,
    options: options.map((option) => option.trim()).filter(Boolean),
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
});



export const getAllAttributes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    subCategory,
    isActive,
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (
    !Number.isInteger(pageNumber) ||
    !Number.isInteger(limitNumber) ||
    pageNumber < 1 ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid pagination values",
    });
  }

  const query = {};

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

  const skip = (pageNumber - 1) * limitNumber;

  const [attributes, totalDocs] = await Promise.all([
    Attribute.find(query)
      .populate("subCategory", "name category")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),

    Attribute.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    data: attributes,
    pagination: {
      totalDocs,
      totalPages: Math.ceil(totalDocs / limitNumber),
      page: pageNumber,
      limit: limitNumber,
      hasNextPage: skip + attributes.length < totalDocs,
      hasPrevPage: pageNumber > 1,
    },
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

  const newSubCategory = subCategory ?? attribute.subCategory;
  const newKey =
    key !== undefined ? key.trim().toLowerCase() : attribute.key;
  const newInputType = inputType ?? attribute.inputType;
  const newOptions = options ?? attribute.options;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Attribute name cannot be empty",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(newSubCategory)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subcategory ID",
    });
  }

  const allowedInputTypes = [
    "text",
    "number",
    "select",
    "multiselect",
    "boolean",
  ];

  if (!allowedInputTypes.includes(newInputType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute input type",
    });
  }

  if (!/^[a-z][a-z0-9_]*$/.test(newKey)) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute key",
    });
  }

  if (!Array.isArray(newOptions)) {
    return res.status(400).json({
      success: false,
      message: "Options must be an array",
    });
  }

  if (
    ["select", "multiselect"].includes(newInputType) &&
    newOptions.filter((option) => typeof option === "string" && option.trim()).length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Select and multiselect attributes require options",
    });
  }

  const subcategory = await Subcategory.findOne({
    _id: newSubCategory,
    isActive: true,
  });

  if (!subcategory) {
    return res.status(404).json({
      success: false,
      message: "Active subcategory not found",
    });
  }

  // Prevent duplicate keys within the same subcategory
  const duplicate = await Attribute.findOne({
    _id: { $ne: id },
    subCategory: newSubCategory,
    key: newKey,
  });

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "This attribute key already exists in this subcategory",
    });
  }

  if (name !== undefined) attribute.name = name.trim();

  attribute.key = newKey;
  attribute.subCategory = newSubCategory;
  attribute.inputType = newInputType;
  attribute.options = newOptions
    .map((option) => option.trim())
    .filter(Boolean);

  if (isRequired !== undefined) attribute.isRequired = isRequired;
  if (isFilterable !== undefined) attribute.isFilterable = isFilterable;
  if (isVariant !== undefined) attribute.isVariant = isVariant;

  await attribute.save();

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
