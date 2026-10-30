import express from "express";
import {
  createReview,
  deleteMyReview,
  deleteReviewAsAdmin,
  getAdminReviews,
  getProductReviews,
} from "../controller/reviewController.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
const ReviewRouter = express.Router();

ReviewRouter.get(
  "/admin/all",
  verifiveToken,
  authorizeRoles("admin"),
  getAdminReviews
);

ReviewRouter.delete(
  "/admin/:reviewId",
  verifiveToken,
  authorizeRoles("admin"),
  deleteReviewAsAdmin
);

ReviewRouter.get(
  "/product/:productId",
  getProductReviews
);

ReviewRouter.post(
  "/",
  verifiveToken,
  authorizeRoles("customer"),
  createReview
);

ReviewRouter.delete(
  "/:reviewId",
  verifiveToken,
  authorizeRoles("customer"),
  deleteMyReview
);

export default ReviewRouter