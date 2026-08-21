import express from 'express'
import UserController from '../controller/userController.js'
const UserRouther=express.Router()

UserRouther.use('/users',UserController)
export default UserRouther