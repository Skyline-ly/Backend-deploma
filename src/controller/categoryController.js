import express from 'express'
import { verifiveToken } from '../middlewar/authCatch'
import { authorizeRoles } from '../middlewar/adminCatch'
import asynchandler from 'express-async-handler'

const categoryRouter=express.Router()

categoryRouter.use('/create-category',verifiveToken,authorizeRoles('admin'),asynchandler(async(req ,res)=>{
    const 
}))