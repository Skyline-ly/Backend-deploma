import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2'

const categorySchama=new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    image: {
      url: String,
      publicId: String,
    },
    createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
categorySchama.plugin(mongoosePaginate)

export const Category = mongoose.model("Category", categorySchama);