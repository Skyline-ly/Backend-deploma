import express from 'express'
import AuthController from '../controller/authController.js'
const AuthRouter=express.Router()

AuthRouter.use('/auth',AuthController)

export default AuthRouter