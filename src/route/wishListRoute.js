
import express from "express";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
import { addToWishlist, getWishlist, removeFromWishlist } from "../controller/wishListController.js";
const WishlistRouter = express.Router();


WishlistRouter.get(
  "/",
  verifiveToken,
  authorizeRoles("customer"),
  getWishlist
);

WishlistRouter.post(
  "/",
  verifiveToken,
  authorizeRoles("customer"),
  addToWishlist
);

WishlistRouter.delete(
  "/:productId",
  verifiveToken,
  authorizeRoles("customer"),
  removeFromWishlist
);

export default WishlistRouter