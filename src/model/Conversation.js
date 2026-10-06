import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


conversationSchema.index(
  { customer: 1, seller: 1 },
  { unique: true }
);

export const Conversation = mongoose.model(
  "Conversation",
  conversationSchema
);