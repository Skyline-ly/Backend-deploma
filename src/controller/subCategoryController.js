import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Subcategory } from "../model/Subcategory.js";
import { applyCreatedAtRange, getCreatedAtRange } from "../utils/dateRange.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);


export const getSubcategory = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    !Number.isInteger(limitNumber) ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid pagination values",
    });
  }

  const query = { isActive: true };
  const { range, error } = getCreatedAtRange(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }
  applyCreatedAtRange(query, range);

  if (typeof search === "string" && search.trim()) {
    query.name = {
      $regex: search.trim(),
      $options: "i",
    };
  }

  if (category) {
    if (!isValidId(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    query.category = category;
  }

  const [subCategory, count] = await Promise.all([
    Subcategory.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber),

    Subcategory.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    count,
    subCategory,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(count / limitNumber),
    },
  });
});

// CREATE: Create a subcategory
export const createSubcategory = asyncHandler(async (req, res) => {
  const { name, category } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    !category ||
    !isValidId(category) ||
    !req.file?.path
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid name, category, and image are required",
    });
  }

  const normalizedName = name.trim().toLowerCase();

  const categoryExists = await mongoose.model("Category").findOne({
    _id: category,
    isActive: true,
  });

  if (!categoryExists) {
    return res.status(404).json({
      success: false,
      message: "Active parent category not found",
    });
  }

  const existingSubcategory = await Subcategory.findOne({
    name: normalizedName,
    category,
  });

  if (existingSubcategory) {
    return res.status(409).json({
      success: false,
      message: "Subcategory already exists in this category",
    });
  }

  const subcategory = await Subcategory.create({
    name: normalizedName,
    image: {
      url: req.file.path,
      publicId: req.file.filename,
    },
    category,
    createdBy: req.user.userId,
  });

  return res.status(201).json({
    success: true,
    message: "Subcategory created successfully",
    data: subcategory,
  });
});


export const updateSubcategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subcategory ID",
    });
  }

  if (req.body.image !== undefined) {
    return res.status(400).json({
      success: false,
      message: "Upload the image as a file using the image field",
    });
  }

  const subcategory = await Subcategory.findOne({
    _id: id,
    isActive: true,
  });

  if (!subcategory) {
    return res.status(404).json({
      success: false,
      message: "Active subcategory not found",
    });
  }

  const newName =
    name === undefined ? subcategory.name :
    typeof name === "string" ? name.trim().toLowerCase() : "";

  if (!newName) {
    return res.status(400).json({
      success: false,
      message: "Subcategory name cannot be empty",
    });
  }

  const newCategory = category === undefined
    ? subcategory.category.toString()
    : category;

  if (!isValidId(newCategory)) {
    return res.status(400).json({
      success: false,
      message: "Invalid category ID",
    });
  }

  const categoryExists = await mongoose.model("Category").findOne({
    _id: newCategory,
    isActive: true,
  });

  if (!categoryExists) {
    return res.status(404).json({
      success: false,
      message: "Active parent category not found",
    });
  }

  const duplicate = await Subcategory.findOne({
    _id: { $ne: id },
    name: newName,
    category: newCategory,
    isActive: true,
  });

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "Subcategory already exists in this category",
    });
  }

  subcategory.name = newName;
  subcategory.category = newCategory;

  if (req.file?.path) {
    subcategory.image = {
      url: req.file.path,
      publicId: req.file.filename,
    };
  }

  await subcategory.save();

  return res.status(200).json({
    success: true,
    message: "Subcategory updated successfully",
    data: subcategory,
  });
});


export const deleteSubcategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subcategory ID",
    });
  }

  const subcategory = await Subcategory.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: { isActive: false } },
    { new: true }
  );

  if (!subcategory) {
    return res.status(404).json({
      success: false,
      message: "Active subcategory not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Subcategory deactivated successfully",
    data: subcategory,
  });
});