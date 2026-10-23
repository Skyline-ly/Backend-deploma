import mongoose from "mongoose";

export async function removeObsoleteCartIndex() {
  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("MongoDB connection is not available");
  }

  const collectionExists = await database
    .listCollections({ name: "carts" }, { nameOnly: true })
    .hasNext();

  if (!collectionExists) {
    console.info("Carts collection does not exist; skipping migration");
    return;
  }

  const carts = database.collection("carts");
  const indexes = await carts.indexes();


  const obsoleteIndexName = "items.productId_1";

  const obsoleteIndex = indexes.find(
    (index) => index.name === obsoleteIndexName,
  );

  if (!obsoleteIndex) {
    console.info("Obsolete cart index not found; skipping migration");
    return;
  }

  await carts.dropIndex(obsoleteIndexName);

  console.info(`Removed obsolete cart index: ${obsoleteIndexName}`);
}