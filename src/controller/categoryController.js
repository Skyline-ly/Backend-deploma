import express from 'express'
import { verifiveToken } from '../middlewar/authCatch'
import { authorizeRoles } from '../middlewar/adminCatch'
import asynchandler from 'express-async-handler'
import { Category } from '../model/Category.js'

const categoryRouter=express.Router()

categoryRouter.post('/create-category',verifiveToken,authorizeRoles('admin'),asynchandler(async(req ,res)=>{
    const {name,image}=req.body

    if(!name || !image){
        return res.json({
            message:"all field are requrire"
        })
    }

    const category=await Category.create({
        message:"category create succeffully ",
        data:{
            categoryId:category._id,
            name:category.name,
            categoryImage:category.image
        }
    })


}))
categoryRouter.delete('/delete-category/:id',verifiveToken,authorizeRoles('admin'),asynchandler(async(req,res)=>{
    const category=await Category.findAndDeleteOne(req.params.id)
    return res.json({
        message:"category delete succeffully"

    })
}))
categoryRouter.put('/update-category/:id',verifiveToken,authorizeRoles('admin'),asynchandler(async(req,res)=>{
    
}))

