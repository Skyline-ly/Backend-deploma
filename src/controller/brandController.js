import express from 'express'
import asynhandler from 'express-async-handler'
import { Brand } from '../model/Brand.js'


export const createBrand= asynhandler(async(req,res)=>{
    const {name,image,category}=req.body
    if(!name || !image ||!category){
        return res.json({message:'filed requrired'})

    }
    const analy=name.trim().toLowerCase();

    const isExite= await Brand.findOne({name:analy,category})
    
    if(isExite){

        return res.json({message:"brand alrady have"})

    }
    const brand=await Brand.create({
        name:analy,
        image,
        category,
        createdBy:req.user.userId
    })

    return res.json({
        message:"create succeffully",
        data:{
            brandId:brand._id,
            brandname:brand.name,
            brandIm:brand.image,
            createdBy:brand.createdBy,
            category:brand.category
        }
    })
})


export const updateBrand=asynhandler(async(req,res)=>{

    const {id}=req.params
    const {image,category,name}=req.body

    const brand=await Brand.findById(id)

    if(!brand){
        return res.json({message:'brand not found'})
    }

    if(name !==undefined){
        brand.name=name.trim().toLowerCase()
    }
    if(category !==undefined){
        brand.category=category
    }
    if(image !==undefined){
        brand.image=image
    }
    await brand.save()

    return res.json({message:'brand update succeffully',
        data:brand
    })

})
export const getBrand=asynhandler(async(req,res)=>{
    const brand=await Brand.find()
    res.json(brand)
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






