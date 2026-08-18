import express from 'express'
import asynchandler from 'express-async-handler'
import { User } from '../model/User.js'
import { verifiveToken } from '../middlewar/authCatch.js'
import { authorizeRoles } from '../middlewar/adminCatch.js'


const UserController = express.Router()

UserController.get(
  '/pending',
  verifiveToken,
  authorizeRoles('admin'),
  asynchandler(async (req, res) => {

    const sellers = await User.find({
      sellerStatus: 'pending'
    }).select('-password');

    return res.status(200).json({
      success: true,
      count: sellers.length,
      data: sellers
    });
  })
);
UserController.get('/search',verifiveToken,authorizeRoles('admin'),asynchandler(async (req, res) => {

    const { page = 1, limit = 10, search, sellerStatus, role } = req.query

    const query = {}

    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }
    if (sellerStatus) {
      query.sellerStatus = sellerStatus
    }

    if (role) {
      query.role = role
    }
    const user = await User.paginate(query, { page, limit })
    return res.send(user)

  })
);


UserController.put('/sellers/:id/approve', verifiveToken, authorizeRoles('admin'), asynchandler(async (req, res) => {
  const { id } = req.params

  const user = await User.findById(id)

  if (!user) {

    return res.json('user is not found')
  }
  if (user.sellerStatus !== 'pending') {
    return res.json('seller is not pending')
  }

  user.role = 'seller'
  user.sellerStatus = 'approved'

  await user.save()
  res.status(200).json({
    success: true,
    message: "Seller approved successfully",
    data: {
      id: user._id,
      name: user.name,
      role: user.role,
      sellerStatus: user.sellerStatus
    }
  });
}));


UserController.put('/sellers/:id/unsuspend', verifiveToken, authorizeRoles('admin'), asynchandler(async (req, res) => {

  const { id } = req.params

  const user = await User.findById(id)

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  if (user.sellerStatus !== 'suspended') {
    return res.status(400).json({
      success: false,
      message: 'Seller is not suspended'
    })
  }

  user.sellerStatus = 'approved'

  await user.save()

  return res.status(200).json({
    success: true,
    message: 'Seller unsuspended successfully',
    data: {
      id: user._id,
      name: user.name,
      role: user.role,
      sellerStatus: user.sellerStatus
    }
  })
})
)

UserController.put('/sellers/:id/unreject', verifiveToken, authorizeRoles('admin'), asynchandler(async (req, res) => {

  const { id } = req.params

  const user = await User.findById(id)

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  if (user.sellerStatus !== 'rejected') {
    return res.status(400).json({
      success: false,
      message: 'Seller is not rejected'
    })
  }

  user.sellerStatus = 'pending'

  await user.save()

  return res.status(200).json({
    success: true,
    message: 'Seller application restored to pending',
    data: {
      id: user._id,
      name: user.name,
      role: user.role,
      sellerStatus: user.sellerStatus
    }
  })
})
)


UserController.put('/sellers/update-profile', verifiveToken, asynchandler(async (req, res) => {

  const userId = req.user.userId
  const { name, phone } = req.body

  const user = await User.findById(userId)

  if (!user) {
    return res.json({ message: 'user not found' })
  }

  if (name) {
    user.name = name.trim()
  }
  if (phone) {
    user.phone = phone.trim()
  }
  await user.save()

  return res.json({
    message: "update suceffully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      sellerStatus: user.sellerStatus,
      avatar: user.avatar
    }
  })

}))

UserController.put('/sellers/:id/reject', verifiveToken, authorizeRoles('admin'), asynchandler(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id)

  if (!user) {
    return res.json({
      success: false,
      message: "user not fould"
    })
  }
  if (user.sellerStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Seller application is not pending'
    })
  }
  user.sellerStatus = 'rejected'

  await user.save()
  return res.status(200).json({
    success: true,
    message: 'Seller reject successfully',
    data: {
      id: user._id,
      name: user.name,
      role: user.role,
      sellerStatus: user.sellerStatus
    }
  });



}));


UserController.put('/seller/:id/suspend',verifiveToken,authorizeRoles('admin'),asynchandler(async (req, res) => {

    const { id } = req.params
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (
      user.role !== 'seller' ||
      user.sellerStatus !== 'approved'
    ) {
      return res.status(400).json({
        success: false,
        message: 'User is not an active seller'
      });
    }

    user.sellerStatus = 'suspended';

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Seller suspended successfully',
      data: {
        id: user._id,
        name: user.name,
        role: user.role,
        sellerStatus: user.sellerStatus
      }
    });
  })
);





export default UserController