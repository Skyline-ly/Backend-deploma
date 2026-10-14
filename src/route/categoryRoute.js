import express from "express"
import { verifiveToken } from "../middleware/verifyToken.js"
import { createCategory, deleteCategory, getAllcategory, getCategoryId, updateCategory } from "../controller/categoryController.js"
import { authorizeRoles } from "../middleware/catchByRole.js"
import upload from "../middleware/multer.js"



const CategoryRouter=express.Router()
CategoryRouter.get('/',getAllcategory)

CategoryRouter.get('/:id',getCategoryId)

 CategoryRouter.post('/create',verifiveToken,authorizeRoles('admin'),upload.single('image')
,createCategory)

CategoryRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),updateCategory)

CategoryRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteCategory)



export default CategoryRouter