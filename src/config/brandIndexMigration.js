import mongoose from "mongoose";

export async function removeObsoleteBrandNameIndex() {
  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("MongoDB connection is not available");
  }

  const collectionExists = await database
    .listCollections({ name: "brands" }, { nameOnly: true })
    .hasNext();

  if (!collectionExists) {
    console.info("Brands collection does not exist; skipping migration");
    return;
  }

  const brands = database.collection("brands");
  const indexes = await brands.indexes();
  const obsoleteIndex = indexes.find(
    (index) =>
      index.name === "name_1" &&
      index.unique === true &&
      Object.keys(index.key).length === 1 &&
      index.key.name === 1,
  );

  if (!obsoleteIndex) {
    console.info("Obsolete brand name index not found; skipping migration");
    return;
  }

  await brands.dropIndex(obsoleteIndex.name);
  console.info(`Removed obsolete brand index: ${obsoleteIndex.name}`);
}
