import express from 'express'
import { verifiveToken } from '../middlewar/verifyToken.js'
import { authorizeRoles } from '../middlewar/catchByRole.js'

import { createProduct, deleteProduct, getAllproducts, updateProduct } from '../controller/productController.js'

const ProductRouter=express.Router()



ProductRouter.get('/',getAllproducts)
ProductRouter.post('/create',verifiveToken,authorizeRoles('seller'),createProduct)
ProductRouter.put('/:id/update',verifiveToken,authorizeRoles('seller'),updateProduct)
ProductRouter.delete('/:id/delete',verifiveToken,authorizeRoles('seller'),deleteProduct)

export default ProductRouter
