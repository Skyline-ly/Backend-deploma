import express from "express";
import mongoose from "mongoose";
import helmet from 'helmet'
import dotenv from "dotenv";
import { dbConnect } from "./src/confic/db.js";
import { JSCatch } from "./src/middlewar/jsonFormatCatch.js";
import AuthRouter from "./src/route/authRoute.js";
import UserRouther from "./src/route/userRoute.js";
import mongoSanitize from 'express-mongo-sanitize';
import CategoryRouter from "./src/route/categoryController.js";


dotenv.config();

await dbConnect()

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());


app.use(express.json());
app.use(mongoSanitize())
app.use(JSCatch)
app.get("/", (req, res) => {
  res.send("Server is running");
});
app.use('/api',AuthRouter)
app.use('/api',UserRouther)
app.use('/api',CategoryRouter)

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});