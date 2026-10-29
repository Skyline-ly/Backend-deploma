
import express from "express";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
import { addToWishlist, getWishlist, removeFromWishlist } from "../controller/wishListController.js";
const WishlistRouter = express.Router();


WishlistRouter.get(
  "/",
  verifiveToken,
  authorizeRoles("customer", "seller"),
  getWishlist
);

WishlistRouter.post(
  "/",
  verifiveToken,
  authorizeRoles("customer", "seller"),
  addToWishlist
);

WishlistRouter.delete(
  "/:productId",
  verifiveToken,
  authorizeRoles("customer", "seller"),
  removeFromWishlist
);

export default WishlistRouter