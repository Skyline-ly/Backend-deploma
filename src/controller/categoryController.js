import asynchandler from 'express-async-handler'
import { Category } from '../model/Category.js'


export const createCategory=asynchandler(async(req ,res)=>{
    const {name,image}=req.body
    if(!name || !image){
        return res.status(400).json({
            success: false,
            message:"All fields are required"
        })
    }
    const analy=name.trim().toLowerCase();
    const isCategoryNameExit=await Category.findOne({
        name:analy
    })
    if (isCategoryNameExit) {
        return res.status(409).json({
            success: false,
            message: 'Category already exists'
        });
    }
    const category=await Category.create({
        name:analy,image,
        createdBy:req.user.userId
    })
    return res.status(201).json({
        success: true,
        message:"Category created successfully",
        data:{
            categoryId:category._id,
            name:category.name,
            categoryImage:category.image,
            createdBy: category.createdBy
        }
    })

})

export const getCategoryId=asynchandler(async(req,res)=>{

    const {id}=req.params

    const category=await Category.findOne({_id:id,
        isActive:true
    })
    if(!category){
        return res.status(404).json({
            success: false,
            message:"Category not found"
        })
    }

    return res.status(200).json({
        success: true,
        data: category
    })

})

export const getAllcategory=asynchandler(async(req,res)=>{

   const {page=1,limit=10,search}=req.query

    const query={isActive:true}

    if(search){
        query.name={$regex:search,$options:'i'}
    }
    const category=await Category.paginate(query,{page,limit})

    return res.status(200).json({
        success: true,
        count: category.length,
        data: category
    })

})

export const deleteCategory=asynchandler(async (req, res) => {

    const { id } = req.params

    const category = await Category.findById(id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      })
    }
    category.isActive = false
    await category.save()

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: {
        categoryId: category._id,
        name: category.name
      }
    })
  })

export const updateCategory = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { name, image } = req.body;

    const category = await Category.findById(id);

    if (!category) {
        return res.status(404).json({
            success: false,
            message: "Category not found"
        });
    }

    if (name !== undefined) {
        const normalizedName = name.trim().toLowerCase();

        const exists = await Category.findOne({
            name: normalizedName,
            _id: { $ne: id }
        });

        if (exists) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists"
            });
        }

        category.name = normalizedName;
    }

    if (image !== undefined) {
        category.image = image;
    }

    await category.save();

    return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: category
    });
});



