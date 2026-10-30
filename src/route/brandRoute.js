import express from 'express'
import { verifiveToken } from '../middleware/verifyToken.js'
import { authorizeRoles } from '../middleware/catchByRole.js'
import { createBrand, deleteBrand, getAdminBrands, getBrand, getBrandById, restoreBrand, updateBrand } from '../controller/brandController.js'
import upload from '../middleware/multer.js'
const BrandRouter=express.Router()

BrandRouter.get('/',getBrand)
BrandRouter.get('/admin/all',verifiveToken,authorizeRoles('admin'),getAdminBrands)
BrandRouter.patch('/:id/restore',verifiveToken,authorizeRoles('admin'),restoreBrand)
BrandRouter.get('/:id',getBrandById)
BrandRouter.post('/create',verifiveToken,authorizeRoles('admin'),upload.single('image'),createBrand)
BrandRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),upload.single('image'),updateBrand)
BrandRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteBrand)
export default BrandRouter