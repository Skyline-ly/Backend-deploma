import express from 'express'
import { verifiveToken } from '../middlewar/verifyToken.js'
import { authorizeRoles } from '../middlewar/catchByRole.js'
import { createBrand, deleteBrand, updateBrand } from '../controller/brandController.js'
const BrandRouter=express.Router()

BrandRouter.post('/',createBrand)
BrandRouter.post('/create',verifiveToken,authorizeRoles('admin'),createBrand)
BrandRouter.post('/:id/update',verifiveToken,authorizeRoles('admin'),updateBrand)
BrandRouter.post('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteBrand)
export default BrandRouter