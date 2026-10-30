import mongoose from "mongoose";
import { removeObsoleteCartIndex } from "./cartIndexMigration.js";
import { removeObsoleteBrandNameIndex } from "./brandIndexMigration.js";

export const dbConnect = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL;

    if (!mongoUrl) {
      throw new Error("MONGODB_URL environment variable is missing");
    }

    await mongoose.connect(mongoUrl);

    await removeObsoleteCartIndex();
    await removeObsoleteBrandNameIndex();

    console.info("Database connected successfully");
  } catch (error) {
    console.error("Database connection or migration failed:", error);
    process.exit(1);
  }
};