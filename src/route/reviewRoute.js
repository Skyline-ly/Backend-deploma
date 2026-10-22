import express from "express";
import { createReview, deleteMyReview, getProductReviews } from "../controller/reviewController.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
const ReviewRouter = express.Router();


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