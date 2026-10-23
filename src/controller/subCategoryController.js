import asynchandler from 'express-async-handler'
import mongoose from 'mongoose'
import { Subcategory } from '../model/Subcategory.js'


export const getSubcategory=asynchandler(async(req,res)=>{
    const{page=1,limit=10,search,category}=req.query
    const pageNumber = Number(page)
    const limitNumber = Number(limit)

    if (!Number.isInteger(pageNumber) || pageNumber < 1 ||
        !Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
        return res.status(400).json({
            success: false,
            message: 'Invalid pagination values'
        })
    }

    const query={isActive:true}

    if(typeof search === 'string' && search.trim()){
        query.name={$regex:search.trim(),$options:'i'}
    }
    if(category){
        if (!mongoose.Types.ObjectId.isValid(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            })
        }
        query.category=category
    }
    const [subCategory, count] = await Promise.all([
        Subcategory.find(query)
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber),
        Subcategory.countDocuments(query)
    ])

    return res.status(200).json({
        success:true,
        count,
        subCategory,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(count / limitNumber)
        }
    })
})
export const createSubcategory=asynchandler(async(req,res)=>{
    const {name,image,category}=req.body
    const imageUrl = typeof image === 'string' ? image : image?.url
    if(typeof name !== 'string' || !name.trim() ||
        typeof imageUrl !== 'string' || !imageUrl.trim() || !category){
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
        image: typeof image === 'string' ? { url: image.trim() } : { ...image, url: imageUrl.trim() },
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
        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Subcategory name cannot be empty'
            })
        }
        subcategory.name=name.trim().toLowerCase()
    }
    if(image !==undefined){
        const imageUrl = typeof image === 'string' ? image : image?.url
        if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Image must include a URL'
            })
        }
        subcategory.image = typeof image === 'string'
            ? { url: image.trim() }
            : { ...image, url: imageUrl.trim() }
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
