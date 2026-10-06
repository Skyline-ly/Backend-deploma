import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import {Conversation} from "../model/Conversation.js";
import { User } from "../model/User.js";




export const getOrCreateConversation = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;
    const { sellerId } = req.body;


    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID",
      });
    }


    if (userId.toString() === sellerId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot chat with yourself",
      });
    }


    const seller = await User.findById(sellerId)
      .select("_id name email role");

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

   
    let conversation = await Conversation.findOne({
      customer: userId,
      seller: sellerId,
    })
      .populate("customer", "name email")
      .populate("seller", "name email");

   
    if (!conversation) {
      conversation = await Conversation.create({
        customer: userId,
        seller: sellerId,
      });

      conversation = await Conversation.findById(
        conversation._id
      )
        .populate("customer", "name email")
        .populate("seller", "name email");
    }

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
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation = await Conversation.findById(id)
      .populate("customer", "name email")
      .populate("seller", "name email");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

   
    const isCustomer =
      conversation.customer._id.toString() ===
      userId.toString();

    const isSeller =
      conversation.seller._id.toString() ===
      userId.toString();

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