import express from "express";

import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
} from "../controller/messageController.js";
import { verifiveToken } from "../middleware/verifyToken.js";

const MessageRouter = express.Router();



MessageRouter.get(
  "/:conversationId",
  verifiveToken,
  getMessages
);



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