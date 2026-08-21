import express from "express"
import { verifiveToken } from "../middlewar/verifyToken.js"
import { createCategory, deleteCategory, getAllcategory, getCategoryId, searchCategoty, updateCategory } from "../controller/categoryController.js"
import { authorizeRoles } from "../middlewar/catchByRole.js"



const CategoryRouter=express.Router()

CategoryRouter.get('/search',searchCategoty)

CategoryRouter.get('/',getAllcategory)

CategoryRouter.get('/:id',getCategoryId)

CategoryRouter.post('/create',verifiveToken,authorizeRoles('admin'),createCategory)

CategoryRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),updateCategory)

CategoryRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteCategory)



export default CategoryRouter