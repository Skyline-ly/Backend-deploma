import express from "express"
import categoryController from "../controller/categoryController.js"


const CategoryRouter=express.Router()

CategoryRouter.use('/category',categoryController)

export default CategoryRouter