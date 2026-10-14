import express from 'express'
import { verifiveToken } from '../middleware/verifyToken.js'
import { authorizeRoles } from '../middleware/catchByRole.js'
import { createSubcategory, deleteSubcategory, getSubcategory, updateSubcategoy } from '../controller/subCategoryController.js'
const SubCategoryRouter=express.Router()


SubCategoryRouter.get('/',getSubcategory)
SubCategoryRouter.post('/create',verifiveToken,authorizeRoles('admin'),createSubcategory)
SubCategoryRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),updateSubcategoy)
SubCategoryRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteSubcategory)

export default SubCategoryRouter