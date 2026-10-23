import mongoose from "mongoose";

async function removeObsoleteCartIndex() {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB connection is not available");
  }

  const cartCollectionExists = await database
    .listCollections({ name: "carts" }, { nameOnly: true })
    .hasNext();
  if (!cartCollectionExists) return;

  const carts = database.collection("carts");
  const indexes = await carts.indexes();
  const obsoleteIndexes = indexes.filter(
    (index) =>
      index.name !== "_id_" &&
      index.unique === true &&
      Object.keys(index.key).some((key) => key.startsWith("items.")),
  );

  for (const index of obsoleteIndexes) {
    await carts.dropIndex(index.name);
    console.info(`Removed obsolete MongoDB cart index: ${index.name}`);
  }
}

export const dbConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    await removeObsoleteCartIndex();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection or index migration failed");
    console.error(error);
    process.exit(1);
  }
};