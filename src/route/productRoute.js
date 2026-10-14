import express from "express";

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controller/productController.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";



const ProductRouter = express.Router();


ProductRouter.get("/", getAllProducts);
ProductRouter.get("/:id", getProductById);


ProductRouter.post(
  "/",
  verifiveToken,
  authorizeRoles("seller"),
  createProduct
);

ProductRouter.put(
  "/:id",
  verifiveToken,
  authorizeRoles("seller"),
  updateProduct
);

ProductRouter.delete(
  "/:id",
  verifiveToken,
  authorizeRoles("seller"),
  deleteProduct
);

export default ProductRouter;