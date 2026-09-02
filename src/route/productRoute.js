import express from 'express'
import { verifiveToken } from '../middlewar/verifyToken.js'
import { authorizeRoles } from '../middlewar/catchByRole.js'
import { createBrand } from '../controller/brandController.js'

const ProductRputer=express.Router()
ProductRputer.post('/create',verifiveToken,authorizeRoles('seller'),createBrand)
export default ProductRputer
