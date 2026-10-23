import express from "express";

import {
  createProduct,
  getMyProducts,
  getPendingProducts,
  reviewProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controller/productController.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
import upload from "../middleware/multer.js";



const ProductRouter = express.Router();


ProductRouter.get("/", getAllProducts);
ProductRouter.get(
  "/mine",
  verifiveToken,
  authorizeRoles("seller"),
  getMyProducts
);
ProductRouter.get(
  "/admin/pending",
  verifiveToken,
  authorizeRoles("admin"),
  getPendingProducts
);
ProductRouter.patch(
  "/:id/review",
  verifiveToken,
  authorizeRoles("admin"),
  reviewProduct
);
ProductRouter.get("/:id", getProductById);


ProductRouter.post(
  "/",
  verifiveToken,
  authorizeRoles("seller"),
  upload.array("images", 5),
  createProduct
);

ProductRouter.put(
  "/:id",
  verifiveToken,
  authorizeRoles("seller"),
  upload.array("images", 5),
  updateProduct
);

ProductRouter.delete(
  "/:id",
  verifiveToken,
  authorizeRoles("seller"),
  deleteProduct
);

export default ProductRouter;