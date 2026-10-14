
import express from "express";
import {
  getOrCreateConversation,
  getMyConversations,
  getConversationById,
} from "../controller/conversationController.js";
import { verifiveToken } from "../middleware/verifyToken.js";

const ConversationRouter = express.Router();

ConversationRouter.post("/", verifiveToken, getOrCreateConversation);
ConversationRouter.get("/", verifiveToken, getMyConversations);
ConversationRouter.get("/:conversationId", verifiveToken, getConversationById);

export default ConversationRouter;