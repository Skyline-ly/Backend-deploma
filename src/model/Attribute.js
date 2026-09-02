import mongoose from "mongoose";

const attributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },

    inputType: {
      type: String,
      enum: [
        "text",
        "number",
        "select",
        "multiselect",
        "boolean",
      ],
      default: "text",
    },

    options: [
      {
        type: String,
        trim: true,
      },
    ],

    isRequired: {
      type: Boolean,
      default: false,
    },

    isFilterable: {
      type: Boolean,
      default: false,
    },

    isVariant: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);


attributeSchema.index(
  { subCategory: 1, key: 1 },
  { unique: true }
);

export const Attribute = mongoose.model(
  "Attribute",
  attributeSchema
);