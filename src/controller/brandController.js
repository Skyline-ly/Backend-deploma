import express from 'express'
import asynhandler from 'express-async-handler'
import { Brand } from '../model/Brand.js'


export const createBrand= asynhandler(async(req,res)=>{
    const {name,image,category,subCategory}=req.body
    if(!name || !image ||!category ||!subCategory){
        return res.status(400).json({
            success: false,
            message:'All fields are required'
        })
    }
    const analy=name.trim().toLowerCase();

    const isExite= await Brand.findOne({name:analy,category,subCategory})
    
    if(isExite){
        return res.status(409).json({
            success: false,
            message:"Brand already exists"
        })
    }
    const brand=await Brand.create({
        name:analy,
        image,
        category,
        subCategory,
        createdBy:req.user.userId
    })

    return res.status(201).json({
        success: true,
        message:"Brand created successfully",
        data:{
            brandId:brand._id,
            brandname:brand.name,
            brandImage:brand.image,
            category:brand.category,
            subCategory:brand.subCategory,
            createdBy:brand.createdBy,
        }
    })
})


export const updateBrand=asynhandler(async(req,res)=>{

    const {id}=req.params
    const {image,category,name,subCategory}=req.body

    const brand=await Brand.findById(id)

    if(!brand){
        return res.status(404).json({
            success: false,
            message:'Brand not found'
        })
    }

    if(name !==undefined){
        brand.name=name.trim().toLowerCase()
    }
    if(category !==undefined){
        brand.category=category
    }
    if(subCategory !==undefined){
        brand.subCategory=subCategory
    }
    if(image !==undefined){
        brand.image=image
    }
    await brand.save()

    return res.status(200).json({
        success: true,
        message:'Brand updated successfully',
        data:brand
    })

})
export const getBrand=asynhandler(async(req,res)=>{
    const {page=1,limit=10,category,subCategory,search}=req.query

    const query={isActive:true}

    if(search){
        query.name={$regex:search,$options:'i'}
    }
    if(category){
        query.category=category
    }
    if(subCategory){
        query.subCategory=subCategory
    }
    const brand=await Brand.find(query,{page,limit})
    .populate("category","name")
    .populate("subCategory","name")

    return res.status(200).json({
        success: true,
        count:brand.length,
        data:brand
    })
})

export const deleteBrand=asynhandler(async (req, res) => {

        const { id } = req.params;

        const brand = await Brand.findById(id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found"
            });
        }

        brand.isActive = false;

        await brand.save();

        return res.status(200).json({
            success: true,
            message: "Brand deactivated successfully",
            data: brand
        });
})






