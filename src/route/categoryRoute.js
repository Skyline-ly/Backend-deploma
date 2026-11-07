import express from "express"
import { verifiveToken } from "../middleware/verifyToken.js"
import { createCategory, deleteCategory, getCategory, getCategoryById, updateCategory,getAdminCategories,restoreCategory } from "../controller/categoryController.js"
import { authorizeRoles } from "../middleware/catchByRole.js"
import upload from "../middleware/multer.js"



const CategoryRouter=express.Router()

CategoryRouter.get('/',getCategory)
CategoryRouter.get('/admin/all',verifiveToken,authorizeRoles('admin'),getAdminCategories)

CategoryRouter.get('/:id',getCategoryById)

 CategoryRouter.post('/create',verifiveToken,authorizeRoles('admin'),upload.single('image')
,createCategory)

CategoryRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),upload.single('image'),updateCategory)

CategoryRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteCategory)

CategoryRouter.patch('/:id/restore',verifiveToken,authorizeRoles('admin'),restoreCategory)

export default CategoryRouter