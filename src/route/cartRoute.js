import exppress from "express";
import { verifiveToken } from "../middlewar/verifyToken.js";
import { authorizeRoles } from "../middlewar/catchByRole.js";
import { addCartItem, deleteCartItem, getCartItems  } from "../controller/cartController.js";
const CartRouter=exppress.Router()

CartRouter.post('/add',verifiveToken,authorizeRoles('customer'),addCartItem)
CartRouter.get('/',verifiveToken,authorizeRoles('customer'),getCartItems)
CartRouter.delete('/:id/delete',verifiveToken,authorizeRoles('customer'),deleteCartItem)


export default CartRouter