
import asynhandler from 'express-async-handler'
import { Brand } from '../model/Brand.js'


export const createBrand= asynhandler(async(req,res)=>{
    const {name,image,category,subCategory}=req.body
    const imageUrl = typeof image === "string" ? image : image?.url
    if(typeof name !== "string" || !name.trim() ||
        typeof imageUrl !== "string" || !imageUrl.trim() ||
        !category || !subCategory){
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
        image: typeof image === "string" ? { url: image.trim() } : { ...image, url: imageUrl.trim() },
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
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Brand name cannot be empty"
            })
        }
        brand.name=name.trim().toLowerCase()
    }
    if(category !==undefined){
        brand.category=category
    }
    if(subCategory !==undefined){
        brand.subCategory=subCategory
    }
    if(image !==undefined){
        const imageUrl = typeof image === "string" ? image : image?.url
        if (typeof imageUrl !== "string" || !imageUrl.trim()) {
            return res.status(400).json({
                success: false,
                message: "Image must include a URL"
            })
        }
        brand.image = typeof image === "string"
            ? { url: image.trim() }
            : { ...image, url: imageUrl.trim() }
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
    const result=await Brand.paginate(query,{
        page,
        limit,
        populate: [
            { path: "category", select: "name" },
            { path: "subCategory", select: "name" }
        ]
    })

    return res.status(200).json({
        success: true,
        count: result.totalDocs,
        data: result.docs,
        pagination: {
            totalDocs: result.totalDocs,
            totalPages: result.totalPages,
            page: result.page,
            limit: result.limit,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage
        }
    })
})
export const getBrandById=asynhandler(async(req,res)=>{
    const {id}=req.params
    
    const brand=await Brand.findOne({_id:id,isActive:true})

    if(!brand){
        return res.status(404).json({
            success:false,
            message:'brand not found'
        })
    }
    return res.status(200).json({
        success:true,
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




