import asyncHandler from 'express-async-handler'
import { Product } from "../model/Product.js";



export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    basePrice,
    category,
    subCategory,
    brand,
    attributes,
    variants,
    images,
    condition,
  } = req.body;

  if (!name ||basePrice === undefined ||!category ||!subCategory) {
    return res.status(400).json({
      success: false,
      message:
        "All field are required",
    });
  }


  const product = await Product.create({
    name: name.trim(),
    description,
    basePrice,
    category,
    subCategory,
    brand,
    attributes,
    variants,
    images,
    condition,
    seller: req.user.userId,
  });

  return res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product=await Product.findById({_id:id}).populate("category","name").populate('subCategory','name').populate('brand','name').populate('seller','name')
  if(!product){
    return res.status(404).json({
        success:false,
        message:'Product not found'
    })
  }

  return res.status(200).json({
    success:true,
    data:product
  })
  
})
export const deleteProduct=asyncHandler(async(req,res)=>{
    const {id}=req.params
    const product=await Product.findById(id)
    if(!product){
        return res.status(404).json({
            success:false,
            message:'Product not found'
        })
    }
    product.isActive=false
    await product.save()
    return res.status(200).json({
        success:true,
        message:'Product deleted successfully',
        data:product
    })
})
export const updateProduct=asyncHandler(async(req,res)=>{
    const {name,
    description,
    basePrice,
    category,
    subCategory,
    brand,
    attributes,
    variants,
    images,
    condition}=req.body
    const {id}=req.params
    const product=await Product.findById(id)

    if(!product){
        return res.status(404).json({
            success:false,
            message:'Product not found'
            
        })
    }
    if(name !==undefined){
        product.name=name.trim()
    }
    if(description !==undefined){
        product.description=description
    }
    if(basePrice !==undefined){
        product.basePrice=basePrice
    }
    if(category !==undefined){
        product.category=category
    }
    if(subCategory !==undefined){
        product.subCategory=subCategory
    }
    if(brand !==undefined){
        product.brand=brand
    }
    if(attributes !==undefined){
        product.attributes=attributes
    }
    if(variants !==undefined){
        product.variants=variants
    }
    if(images !==undefined){
        product.images=images
    }
    if(condition !==undefined){
        product.condition=condition
    }
    await product.save()
    return res.status(200).json({
        success:true,
        message:'Product updated successfully',
        data:product
    })
})

export const getAllproducts=asyncHandler(async(req,res)=>{
   
const {page=1,limit=10,search}=req.query

    const query={isActive:true}

    if(search){
        query.name={$regex:search,$options:'i'}
    }
    const product=await Product.paginate(query,{page,limit})
    return res.status(200).json({
        success: true,
        count: product.length,
        data: product
    })
   

})
