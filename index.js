// import express from "express";
// import helmet from 'helmet'
// import dotenv from "dotenv";
// import cookieParser from "cookie-parser";
// import cors from 'cors'
// import mongoSanitize from 'express-mongo-sanitize';
// import { dbConnect } from "./src/confic/db.js";
// import { JSCatch } from "./src/middlewar/jsonFormatCatch.js";
// import AuthRouter from "./src/route/authRoute.js";
// import UserRouther from "./src/route/userRoute.js";
// import CategoryRouter from "./src/route/categoryRoute.js";
// import BrandRouter from "./src/route/brandRoute.js";
// import ProductRputer from "./src/route/productRoute.js";


// dotenv.config();

// await dbConnect()

// const app = express();
// const PORT = process.env.PORT || 5000;
// app.use(helmet());
// app.use(cookieParser());


// app.use(express.json());
// app.use(mongoSanitize())
// app.use(JSCatch)

// app.use("/api/auth",AuthRouter );
// app.use('/api/user',UserRouther)
// app.use('/api/categories',CategoryRouter)
// app.use('/api/brand',BrandRouter)
// app.use('/api/product',ProductRputer)

// app.listen(PORT, () => {
//   console.log(`Server is running on port http://localhost:${PORT}`);
// });
import express from "express";
import helmet from 'helmet';
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { dbConnect } from "./src/confic/db.js";
import { JSCatch } from "./src/middlewar/jsonFormatCatch.js";
import AuthRouter from "./src/route/authRoute.js";
import UserRouther from "./src/route/userRoute.js";
import CategoryRouter from "./src/route/categoryRoute.js";
import BrandRouter from "./src/route/brandRoute.js";
import ProductRputer from "./src/route/productRoute.js";

dotenv.config();

const app = express();

// Database Middleware for Serverless Execution
app.use(async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (err) {
    next(err);
  }
});

app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(mongoSanitize());
app.use(JSCatch);

// Routes
app.use("/api/auth", AuthRouter);
app.use('/api/user', UserRouther);
app.use('/api/categories', CategoryRouter);
app.use('/api/brand', BrandRouter);
app.use('/api/product', ProductRputer);

// Default Route for status check
app.get('/m', (req, res) => {
  res.json({ message: "API is running successfully on Vercel!" });
});

// Run app locally if executed directly with Nodemon / Node
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}

// Export the Express app for Vercel
export default app;