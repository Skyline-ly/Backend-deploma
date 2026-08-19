import express from 'express'
import { verifiveToken } from '../middlewar/authCatch.js'
import { authorizeRoles } from '../middlewar/adminCatch.js'
import asynchandler from 'express-async-handler'
import { Category } from '../model/Category.js'

const categoryController=express.Router()

categoryController.post('/create-category',verifiveToken,authorizeRoles('admin'),asynchandler(async(req ,res)=>{
    const {name,image}=req.body

    if(!name || !image){
        return res.json({
            message:"all field are requrire"
        })
    }

    const analy=name.trim().toLowerCase();

    const isCategoryNameExit=await Category.find({
        name:analy
    })
    if (isCategoryNameExit) {
        return res.status(400).json({
            success: false,
            message: 'gategory alrady exite.'
        });
    }
    const category=await Category.create({
        name:analy,image,
        createdBy:req.user.userId
    })
    res.json({
        message :"create successfully "
        ,data:{
            categoryId:category._id,
            name:category.name,
            categoryImage:category.image,
             createdBy: category.createdBy
        }
    })


}))

categoryController.delete('categories/:id/delete',verifiveToken,authorizeRoles('admin'),asynchandler(async (req, res) => {

    const { id } = req.params

    const category = await Category.findByIdAndDelete(id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: {
        categoryId: category._id,
        name: category.name
      }
    })
  })
)
categoryController.put('/category/:id/update',verifiveToken,authorizeRoles('admin',asynchandler(async(req,res)=>{
    const {id}=req.params
    const {name,image}=req.body
    const category =await Category.findById(id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      })
    }

    if(name !== undefined){
        category.name=name.trim()
    }
    if(image !== undefined){
        category.image=image
    }
    await category.save()
    res.json({
        message:"category update succeffully",
        data:category

        
    })
   

})))

export default categoryController

