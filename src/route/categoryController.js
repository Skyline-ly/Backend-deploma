import express from "express"
import categoryController from "../controller/categoryController.js"


const CategoryRouter=express.Router()

CategoryRouter.use('/categories',categoryController)

export default CategoryRouter