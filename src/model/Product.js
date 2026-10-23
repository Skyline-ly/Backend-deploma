import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2'

const variantSchema = new mongoose.Schema(
  {
    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: {
      type: Number,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      index: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: {
      type: Number,
      min: 0,
    },

    // Used when product has no variants
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    condition: {
      type: String,
      enum: ["new", "used", "refurbished"],
      default: "new",
      index: true,
    },

    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String,
      },
    ],

    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);
productSchema.plugin(mongoosePaginate);

export const Product = mongoose.model("Product", productSchema);