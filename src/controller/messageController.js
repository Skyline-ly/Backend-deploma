import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Conversation } from "../model/Conversation.js";
import { Message } from "../model/Message.js";

// Helper: validate MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper: safely get ID
const getId = (value) => value?._id?.toString() || value?.toString();


// ========================================
// SEND MESSAGE
// ========================================

export const sendMessage = asyncHandler(
  async (req, res) => {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { text, product } = req.body;

    // Validate conversation ID
    if (!isValidId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    // Validate message text
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    if (text.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 5000 characters",
      });
    }

    // Validate optional product ID
    if (product && !isValidId(product)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Find conversation
    const conversation = await Conversation.findById(
      conversationId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Verify participants
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

    // Automatically determine receiver
    const receiver = isCustomer
      ? conversation.seller
      : conversation.customer;

    // Prepare message data
    const messageData = {
      conversation: conversation._id,
      sender: userId,
      receiver,
      text: text.trim(),
    };

    // Attach product if provided
    if (product) {
      messageData.product = product;
    }

    // Create message
    const message = await Message.create(messageData);

    // Update conversation's last message
    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = new Date();

    await conversation.save();

    // Populate message information
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .populate("product");

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  }
);


// ========================================
// GET MESSAGES
// ========================================

export const getMessages = asyncHandler(
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

    // Find conversation
    const conversation = await Conversation.findById(
      conversationId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Verify participants
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

    // Get conversation messages
    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .populate("product")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  }
);


// ========================================
// MARK MESSAGES AS READ
// ========================================

export const markMessagesAsRead = asyncHandler(
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

    // Find conversation
    const conversation = await Conversation.findById(
      conversationId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Verify participants
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

    // Only mark messages received by the current user
    const result = await Message.updateMany(
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
      modifiedCount: result.modifiedCount,
    });
  }
);