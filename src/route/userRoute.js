import express from 'express'
import UserController from '../controller/userController.js'
const UserRouther=express.Router()

UserRouther.use('/user',UserController)
export default UserRouther