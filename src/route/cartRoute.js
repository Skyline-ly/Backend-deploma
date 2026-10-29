import exppress from "express";
import { verifiveToken } from "../middleware/verifyToken.js";
import { authorizeRoles } from "../middleware/catchByRole.js";
import { addCartItem, deleteCartItem, getCartItems ,updateCartItem } from "../controller/cartController.js";
const CartRouter=exppress.Router()

CartRouter.post('/add',verifiveToken,authorizeRoles('customer', 'seller'),addCartItem)
CartRouter.get('/',verifiveToken,authorizeRoles('customer', 'seller'),getCartItems)
CartRouter.delete('/:id/delete',verifiveToken,authorizeRoles('customer', 'seller'),deleteCartItem)
CartRouter.put('/:id/update',verifiveToken,authorizeRoles('customer', 'seller'),updateCartItem)


export default CartRouter