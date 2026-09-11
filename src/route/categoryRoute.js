import express from "express"
import { verifiveToken } from "../middlewar/verifyToken.js"
import { createCategory, deleteCategory, getAllcategory, getCategoryId, updateCategory } from "../controller/categoryController.js"
import { authorizeRoles } from "../middlewar/catchByRole.js"
import upload from "../middlewar/multer.js"



const CategoryRouter=express.Router()
CategoryRouter.get('/',getAllcategory)

CategoryRouter.get('/:id',getCategoryId)

 CategoryRouter.post('/create',verifiveToken,authorizeRoles('admin'),upload.single('image')
 //(req, res, next) => {
//         console.log("========== UPLOAD DEBUG ==========");
//         console.log("BODY:", req.body);
//         console.log("FILE:", req.file);
//         console.log("==================================");

//         next();
//     }
,createCategory)

CategoryRouter.put('/:id/update',verifiveToken,authorizeRoles('admin'),updateCategory)

CategoryRouter.delete('/:id/delete',verifiveToken,authorizeRoles('admin'),deleteCategory)



export default CategoryRouter