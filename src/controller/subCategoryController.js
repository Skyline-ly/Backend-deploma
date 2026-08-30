import asynchandler from 'express-async-handler'
import { Subcategory } from '../model/Subcategory'


export const createSubcategory=asynchandler(async(req,res)=>{
    const {name,image,category}=req.body
    if(!name || !image ||category){
        return res.status(404).json({message:'all fields are requrite'})
    }
    const normalizedName=name.trim().tolowerCase()
    const isExit=await Subcategory.findOne({name:normalizedName})

    if(isExit){
        return res.json({message:'subcategory alrady exits'})
    }
    
    const subcategory=await Subcategory.create({
        name:normalizedName,
        image,
        category,
        createdBy:req.user.userId

    })
    

})
