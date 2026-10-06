import exppress from "express";
import { verifiveToken } from "../middlewar/verifyToken.js";
import { authorizeRoles } from "../middlewar/catchByRole.js";
import { addCartItem, deleteCartItem, getCartItems ,updateCartItem } from "../controller/cartController.js";
const CartRouter=exppress.Router()

CartRouter.post('/add',verifiveToken,authorizeRoles('customer'),addCartItem)
CartRouter.get('/',verifiveToken,authorizeRoles('customer'),getCartItems)
CartRouter.delete('/:id/delete',verifiveToken,authorizeRoles('customer'),deleteCartItem)
CartRouter.put('/:id/update',verifiveToken,authorizeRoles('customer'),updateCartItem)


export default CartRouter