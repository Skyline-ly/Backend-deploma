import mongoose from "mongoose";

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
)
export const Brand=mongoose.model("Brand",BrandSchama)