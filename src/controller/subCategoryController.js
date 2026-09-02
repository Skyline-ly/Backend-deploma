import asynchandler from 'express-async-handler'
import { Subcategory } from '../model/Subcategory'


export const getSubcategory=asynchandler(async(req,res)=>{
    const{page=10,limit=1,search,category}=req.query

    const query={isActive:true}

    if(search.trim()){
        query.search={$regex:search,$options:'i'}
    }
    if(category){
        query.category=category
    }
    const subCategory=await Subcategory.find(query,{page,limit}).populate('category',name)

    return res.status(200).json({
        success:true,
        subCategory
    })
})
export const createSubcategory=asynchandler(async(req,res)=>{
    const {name,image,category}=req.body
    if(!name || !image ||!category){
        return res.status(400).json({
            success: false,
            message:'All fields are required'
        })
    }
    const normalizedName=name.trim().toLowerCase()
    const isExit=await Subcategory.findOne({name:normalizedName, category})

    if(isExit){
        return res.status(409).json({
            success: false,
            message:'Subcategory already exists'
        })
    }
    
    const subcategory=await Subcategory.create({
        name:normalizedName,
        image,
        category,
        createdBy:req.user.userId
    })
    return res.status(201).json({
        success: true,
        message:"Subcategory created successfully",
        data:{
            subcategoryId: subcategory._id,
            name:subcategory.name,
            image:subcategory.image,
            category:subcategory.category,
            createdBy:subcategory.createdBy
        }
    })
})
export const deleteSubcategory=asynchandler(async(req,res)=>{
    const {id}=req.params
    const subcategory=await Subcategory.findById(id)
    
    if(!subcategory){
        return res.status(404).json({
            success: false,
            message:"Subcategory not found"
        })
    }

    subcategory.isActive=false
    await subcategory.save()

    return res.status(200).json({
        success: true,
        message:"Subcategory deactivated successfully",
        data:subcategory
    }) 
})
export const updateSubcategoy=asynchandler(async(req,res)=>{
    const {id}=req.params
    const {image,name,category}=req.body
    const subcategory=await Subcategory.findById(id)

    if(!subcategory){
        return res.status(404).json({
            success: false,
            message:"Subcategory not found"
        })
    }

    if(name !==undefined){
        subcategory.name=name.trim().toLowerCase()
    }
    if(image !==undefined){
        subcategory.image=image
    }
    if(category !==undefined){
        subcategory.category=category
    }
    await subcategory.save()

    return res.status(200).json({
        success: true,
        message:"Subcategory updated successfully",
        data:subcategory
    })
})
