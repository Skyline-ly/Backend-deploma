

import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "seller", "admin"],
      default: "customer",
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      url: String,
      publicId: String,
    },
    sellerStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "suspended"],
      default: "none",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);
userSchema.plugin(mongoosePaginate)

export const User = mongoose.model("User", userSchema);
