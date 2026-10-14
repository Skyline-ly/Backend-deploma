import mongoose from "mongoose";
export const dbConnect=async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log(`db connect succefully`)
    } catch (error) {
        console.error('db conectting flase')
        console.error(error)

        process.exit(1)
    }
}