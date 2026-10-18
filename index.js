import express from "express";
import helmet from 'helmet'
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import mongoSanitize from 'express-mongo-sanitize';
import { dbConnect } from "./src/config/db.js";
import { JSCatch } from "./src/middleware/jsonFormatCatch.js";
import AuthRouter from "./src/route/authRoute.js";
import UserRouther from "./src/route/userRoute.js";
import CategoryRouter from "./src/route/categoryRoute.js";
import BrandRouter from "./src/route/brandRoute.js";
import ProductRputer from "./src/route/productRoute.js";
import SubCategoryRouter from "./src/route/subCategoryRoute.js";
import CartRouter from "./src/route/cartRoute.js";
import orderRoute from "./src/route/orderRoute.js";
import ConversationRouter from "./src/route/conversationRoutes.js";
import MessageRouter from "./src/route/messageRoutes.js";
import AttributeRouter from "./src/route/attributeRoute.js";



dotenv.config();

await dbConnect()

const app = express();
const PORT = process.env.PORT || 5000;
app.use(helmet());
app.use(cookieParser());

app.use(express.json());
app.use(mongoSanitize())
app.use(JSCatch)
// app.use(cors());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



app.use("/api/auth",AuthRouter );
app.use('/api/user',UserRouther)
app.use('/api/categories',CategoryRouter)
app.use('/api/subcategory',SubCategoryRouter)
app.use('/api/brand',BrandRouter)
app.use('/api/product',ProductRputer)
app.use('/api/cart',CartRouter)
app.use('/api/order',orderRoute)
app.use('/api/conversation',ConversationRouter)
app.use('/api/message',MessageRouter)
app.use('/api/attribute',AttributeRouter)

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});