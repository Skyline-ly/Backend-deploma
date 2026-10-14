import express from 'express'
import { approveUser, rejectUser, searchUser, suspendUser, unrejectUser, userPending, userProfile } from '../controller/userController.js'
import { verifiveToken } from '../middleware/verifyToken.js'
import { authorizeRoles } from '../middleware/catchByRole.js'


const UserRouther=express.Router()

UserRouther.get('/search',verifiveToken,authorizeRoles('admin'),searchUser)

UserRouther.get('/pending',verifiveToken,authorizeRoles('admin'),userPending)

UserRouther.put('/:id/aprove',verifiveToken,authorizeRoles('admin'),approveUser)

UserRouther.put('/:id/suspend',verifiveToken,authorizeRoles('admin'),suspendUser)

UserRouther.put('/:id/reject',verifiveToken,authorizeRoles('admin'),rejectUser)

UserRouther.put('/:id/unreject',verifiveToken,authorizeRoles('admin'),unrejectUser)

UserRouther.put('/profile',verifiveToken,userProfile)




export default UserRouther