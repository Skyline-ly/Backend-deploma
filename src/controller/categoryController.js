
import asyncHandler from "express-async-handler";
import { Category } from "../model/Category.js";


const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getPaginationOptions = (req) => {
    const page = Math.max(
        1,
        Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    return { page, limit };
};

const getSearchQuery = (search) => {
    if (typeof search !== "string" || !search.trim()) {
        return {};
    }

    return {
        name: {
            $regex: escapeRegex(search.trim()),
            $options: "i",
        },
    };
};


export const createCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Category name is required",
        });
    }

    if (!req.file?.path) {
        return res.status(400).json({
            success: false,
            message: "Category image is required",
        });
    }

    const normalizedName = name.trim().toLowerCase();

    const existingCategory = await Category.findOne({
        name: normalizedName,
    });

    if (existingCategory) {
        return res.status(409).json({
            success: false,
            message: "Category already exists",
        });
    }

    const category = await Category.create({
        name: normalizedName,
        image: {
            url: req.file.path,
            publicId: req.file.filename,
        },
        createdBy: req.user.userId,
    });

    return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: {
            categoryId: category._id,
            name: category.name,
            image: category.image,
            createdBy: category.createdBy,
        },
    });
});


export const getCategory = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationOptions(req);

    const query = {
        isActive: true,
        ...getSearchQuery(req.query.search),
    };

    const categories = await Category.paginate(query, {
        page,
        limit,
        sort: { createdAt: -1 },
    });

    return res.status(200).json({
        success: true,
        count: categories.totalDocs,
        data: categories.docs,
        pagination: {
            totalDocs: categories.totalDocs,
            totalPages: categories.totalPages,
            page: categories.page,
            limit: categories.limit,
            hasNextPage: categories.hasNextPage,
            hasPrevPage: categories.hasPrevPage,
        },
    });
});


export const getAdminCategories = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationOptions(req);

    const query = {
        ...getSearchQuery(req.query.search),
    };

    const categories = await Category.paginate(query, {
        page,
        limit,
        sort: { createdAt: -1 },
    });

    return res.status(200).json({
        success: true,
        count: categories.totalDocs,
        data: categories.docs,
        pagination: {
            totalDocs: categories.totalDocs,
            totalPages: categories.totalPages,
            page: categories.page,
            limit: categories.limit,
            hasNextPage: categories.hasNextPage,
            hasPrevPage: categories.hasPrevPage,
        },
    });
});


export const getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findOne({
        _id: id,
        isActive: true,
    });

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found",
        });
    }

    return res.status(200).json({
        success: true,
        data: category,
    });
});


export const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (req.body.image !== undefined) {
        return res.status(400).json({
            success: false,
            message: "Upload the image as a file using the image field",
        });
    }

    const category = await Category.findById(id);

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found",
        });
    }

    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name cannot be empty",
            });
        }

        const normalizedName = name.trim().toLowerCase();

        const existingCategory = await Category.findOne({
            name: normalizedName,
            _id: { $ne: id },
        });

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists",
            });
        }

        category.name = normalizedName;
    }

    if (req.file?.path) {
        category.image = {
            url: req.file.path,
            publicId: req.file.filename,
        };
    }

    await category.save();

    return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: category,
    });
});


export const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findOne({
        _id: id,
        isActive: true,
    });

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found",
        });
    }

    category.isActive = false;
    await category.save();

    return res.status(200).json({
        success: true,
        message: "Category deleted successfully",
        data: {
            categoryId: category._id,
            name: category.name,
        },
    });
});


export const restoreCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found",
        });
    }

    if (category.isActive) {
        return res.status(400).json({
            success: false,
            message: "Category is already active",
        });
    }

    category.isActive = true;
    await category.save();

    return res.status(200).json({
        success: true,
        message: "Category restored successfully",
        data: category,
    });
});
