import asyncHandler from "express-async-handler";
import { User } from "../model/User.js";

export const requireApprovedSeller = asyncHandler(async (req, res, next) => {
  if (req.user.role === "admin") {
    return next();
  }

  const user = await User.findById(req.user.userId).select(
    "role sellerStatus isActive"
  );

  if (
    !user ||
    !user.isActive ||
    user.role !== "seller" ||
    user.sellerStatus !== "approved"
  ) {
    return res.status(403).json({
      success: false,
      message: "An active, approved seller account is required",
    });
  }

  return next();
});
