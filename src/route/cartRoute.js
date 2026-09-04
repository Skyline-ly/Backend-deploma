import exppress from "express";
import { verifiveToken } from "../middlewar/verifyToken.js";
import { authorizeRoles } from "../middlewar/catchByRole.js";
import { addCartItem } from "../controller/cartController.js";
const CartRouter=exppress.Router()

CartRouter.post('/add',verifiveToken,authorizeRoles('customer'),addCartItem)

export default CartRouter