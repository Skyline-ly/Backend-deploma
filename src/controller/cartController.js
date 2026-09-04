import asyncHandler from "express-async-handler";

export const addChartItem=asyncHandler(async(req,res)=>{
    const {productId,quantity}=req.body
    if(!productId || !quantity){
        return res.status(400).json({
            success:false,
            message:'All fields are required'
        })
    }
    

})