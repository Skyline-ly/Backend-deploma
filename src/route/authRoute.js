import express from 'express'
import { login, register } from '../controller/authController.js'


const AuthRouter=express.Router()

AuthRouter.post('/register',login)
AuthRouter.post('/login',register)

export default AuthRouter