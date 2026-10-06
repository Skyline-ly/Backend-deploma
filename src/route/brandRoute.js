import express from 'express'
import { verifiveToken } from '../middlewar/verifyToken.js'
import { authorizeRoles } from '../middlewar/catchByRole.js'
import { createBrand, deleteBrand, getBrand, getBrandById, updateBrand } from '../controller/brandController.js'
const BrandRouter=express.Router()

BrandRouter.get('/',getBrand)
BrandRouter.get('/:id',getBrandById)
BrandRouter.post('/create',verifiveToken,authorizeRoles('admin'),createBrand)
BrandRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),updateBrand)
BrandRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteBrand)
export default BrandRouter