import express from "express";

import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
} from "../controller/messageController.js";
import { verifiveToken } from "../middlewar/verifyToken.js";

const MessageRouter = express.Router();


// Get messages
MessageRouter.get(
  "/:conversationId",
  verifiveToken,
  getMessages
);


// Send message
MessageRouter.post(
  "/:conversationId",
  verifiveToken,
  sendMessage
);


// Mark as read
MessageRouter.patch(
  "/:conversationId/read",
  verifiveToken,
  markMessagesAsRead
);


export default MessageRouter;