
import cloudinary from '../confic/cloudinary.js'
import {CloudinaryStorage} from 'multer-storage-cloudinary'
import multer from 'multer'

const storage=new CloudinaryStorage({
    cloudinary:cloudinary,
    params:{
        folder:'uploads',
        allowed_formats:['jpg','png','jpeg'],
    }
    

})
const upload =multer({
    storage,
    limits:{
        fileSize:1024*1024*5
    }
})
export default upload