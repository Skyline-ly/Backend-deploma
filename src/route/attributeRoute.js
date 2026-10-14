
import express from "express";

import {
  createAttribute,
  getAllAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
} from "../controller/attributeController.js";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";




const AttributeRouter = express.Router();

AttributeRouter.use(verifiveToken, authorizeRoles("admin"));

AttributeRouter
  .route("/")
  .post(createAttribute)
  .get(getAllAttributes);

AttributeRouter
  .route("/:id")
  .get(getAttributeById)
  .put(updateAttribute)
  .delete(deleteAttribute);

export default AttributeRouter;
