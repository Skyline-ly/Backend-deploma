import express from "express";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controller/notificationController.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
import { verifiveToken } from "../middleware/verifyToken.js";

const notificationRoute = express.Router();

notificationRoute.use(verifiveToken, authorizeRoles("admin", "seller"));
notificationRoute.get("/", getMyNotifications);
notificationRoute.patch("/read-all", markAllNotificationsRead);
notificationRoute.patch("/:id/read", markNotificationRead);

export default notificationRoute;
