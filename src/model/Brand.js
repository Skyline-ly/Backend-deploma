import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2'

const BrandSchama = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },

    image: {
        url: String,
        publicId: String,
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    subCategory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Subcategory",
        required:true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
},
    {
        timestamps: true,
    }
);
BrandSchama.index(
    {
        name: 1,
        category: 1,
        subCategory: 1,
    },
    {
        unique: true,
    }
);


BrandSchama.plugin(mongoosePaginate)
export const Brand=mongoose.model("Brand",BrandSchama)