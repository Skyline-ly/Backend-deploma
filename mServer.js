import express from "express";
import helmet from 'helmet'
import dotenv from "dotenv";
import mongoSanitize from 'express-mongo-sanitize';
import { dbConnect } from "./src/confic/db.js";
import { JSCatch } from "./src/middlewar/jsonFormatCatch.js";
import AuthRouter from "./src/route/authRoute.js";
import UserRouther from "./src/route/userRoute.js";
import CategoryRouter from "./src/route/categoryRoute.js";
import BrandRouter from "./src/route/brandRoute.js";


dotenv.config();

await dbConnect()

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());


app.use(express.json());
app.use(mongoSanitize())
app.use(JSCatch)

app.use("/api/auth",AuthRouter );
app.use('/api/user',UserRouther)
app.use('/api/categories',CategoryRouter)
app.use('/api/brand',BrandRouter)

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});