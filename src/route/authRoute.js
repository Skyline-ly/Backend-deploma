import express from 'express'
import { login, refreshToken, register } from '../controller/authController.js'

const AuthRouter=express.Router()

AuthRouter.post('/register',register)
AuthRouter.post('/login',login)
AuthRouter.post('/refresh',refreshToken)

export default AuthRouter