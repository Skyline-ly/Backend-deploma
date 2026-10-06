import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Conversation } from "../model/Conversation.js";
import { Message } from "../model/Message.js";




export const sendMessage = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { text } = req.body;

   
    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }


    const conversation =
      await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    
    const isCustomer =
      conversation.customer.toString() ===
      userId.toString();

    const isSeller =
      conversation.seller.toString() ===
      userId.toString();

    if (!isCustomer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this conversation",
      });
    }

    
    const receiver = isCustomer
      ? conversation.seller
      : conversation.customer;

  
    const message = await Message.create({
      conversation: conversation._id,
      sender: userId,
      receiver,
      text: text.trim(),
    });

    
    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = new Date();

    await conversation.save();

  
    const populatedMessage =
      await Message.findById(message._id)
        .populate("sender", "name email")
        .populate("receiver", "name email");

    return res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  }
);




export const getMessages = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation =
      await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

  
    const isCustomer =
      conversation.customer.toString() ===
      userId.toString();

    const isSeller =
      conversation.seller.toString() ===
      userId.toString();

    if (!isCustomer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this conversation",
      });
    }

    // Get messages
    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  }
);




export const markMessagesAsRead = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    const conversation =
      await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isCustomer =
      conversation.customer.toString() ===
      userId.toString();

    const isSeller =
      conversation.seller.toString() ===
      userId.toString();

    if (!isCustomer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this conversation",
      });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  }
);