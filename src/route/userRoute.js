
import express from "express";

import {
  approveUser,
  rejectUser,
  searchUser,
  suspendUser,
  unsuspendUser,
  unrejectUser,
  userPending,
  getMyProfile,
  userProfile,
  becomeSeller,
} from "../controller/userController.js";

import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
import upload from "../middleware/multer.js";

const UserRouter = express.Router();


UserRouter.get(
  "/search",
  verifiveToken,
  authorizeRoles("admin"),
  searchUser
);

UserRouter.get(
  "/pending",
  verifiveToken,
  authorizeRoles("admin"),
  userPending
);

UserRouter.put(
  "/:id/approve",
  verifiveToken,
  authorizeRoles("admin"),
  approveUser
);

UserRouter.put(
  "/:id/suspend",
  verifiveToken,
  authorizeRoles("admin"),
  suspendUser
);

UserRouter.put(
  "/:id/unsuspend",
  verifiveToken,
  authorizeRoles("admin"),
  unsuspendUser
);

UserRouter.put(
  "/:id/reject",
  verifiveToken,
  authorizeRoles("admin"),
  rejectUser
);

UserRouter.put(
  "/:id/unreject",
  verifiveToken,
  authorizeRoles("admin"),
  unrejectUser
);


UserRouter.get(
  "/profile",
  verifiveToken,
  authorizeRoles("customer", "seller", "admin"),
  getMyProfile
);

UserRouter.patch(
  "/profile",
  verifiveToken,
  authorizeRoles("customer", "seller", "admin"),
  userProfile
);

UserRouter.post(
  "/become-seller",
  verifiveToken,
  authorizeRoles("customer"),
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "idCardPhoto", maxCount: 1 },
  ]),
  becomeSeller
);

export default UserRouter;
