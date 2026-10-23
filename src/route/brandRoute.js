import express from 'express'
import { verifiveToken } from '../middleware/verifyToken.js'
import { authorizeRoles } from '../middleware/catchByRole.js'
import { createBrand, deleteBrand, getBrand, getBrandById, updateBrand } from '../controller/brandController.js'
import upload from '../middleware/multer.js'
const BrandRouter=express.Router()

BrandRouter.get('/',getBrand)
BrandRouter.get('/:id',getBrandById)
BrandRouter.post('/create',verifiveToken,authorizeRoles('admin'),upload.single('image'),createBrand)
BrandRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),upload.single('image'),updateBrand)
BrandRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteBrand)
export default BrandRouter