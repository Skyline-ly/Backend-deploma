import express from 'express'
import { login, register } from '../controller/authController.js'


const AuthRouter=express.Router()

AuthRouter.post('/login',login)
AuthRouter.post('/register',register)

export default AuthRouter