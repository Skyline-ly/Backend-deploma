import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Notification } from "../model/Notification.js";

export const getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 50)
  );
  const recipient = req.user.userId;
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ recipient, readAt: null }),
  ]);

  return res.status(200).json({
    success: true,
    data: notifications,
    unreadCount,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid notification ID",
    });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user.userId, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!notification) {
    const existing = await Notification.exists({
      _id: id,
      recipient: req.user.userId,
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user.userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return res.status(200).json({
    success: true,
    message: "Notifications marked as read",
    modifiedCount: result.modifiedCount,
  });
});
