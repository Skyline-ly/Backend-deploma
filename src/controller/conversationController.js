import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Conversation } from "../model/Conversation.js";
import { User } from "../model/User.js";


const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getId = (value) => value?._id?.toString() || value?.toString();




export const getOrCreateConversation = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;
    const { sellerId } = req.body;

  
    if (!sellerId || !isValidId(sellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID",
      });
    }

    // Prevent chatting with yourself
    if (userId.toString() === sellerId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot chat with yourself",
      });
    }

    // Check whether seller exists
    const seller = await User.findById(sellerId)
      .select("_id name email role");

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // Verify seller role
    if (seller.role !== "seller") {
      return res.status(403).json({
        success: false,
        message: "This user is not a seller",
      });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      customer: userId,
      seller: sellerId,
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      try {
        conversation = await Conversation.create({
          customer: userId,
          seller: sellerId,
        });
      } catch (error) {
        // Handle simultaneous requests creating the same conversation
        if (error.code === 11000) {
          conversation = await Conversation.findOne({
            customer: userId,
            seller: sellerId,
          });
        } else {
          throw error;
        }
      }
    }

    // Populate conversation details
    conversation = await Conversation.findById(conversation._id)
      .populate("customer", "name email")
      .populate("seller", "name email");

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  }
);




export const getMyConversations = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      $or: [
        { customer: userId },
        { seller: userId },
      ],
    })
      .populate("customer", "name email")
      .populate("seller", "name email")
      .sort({
        lastMessageAt: -1,
        updatedAt: -1,
      });

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  }
);




export const getConversationById = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    // Validate conversation ID
    if (!isValidId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("customer", "name email")
      .populate("seller", "name email");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    
    const isCustomer =
      getId(conversation.customer) === userId.toString();

    const isSeller =
      getId(conversation.seller) === userId.toString();

    if (!isCustomer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this conversation",
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  }
);