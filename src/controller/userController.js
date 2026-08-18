import express from 'express'
import asynchandler from 'express-async-handler'
import { User } from '../model/User.js'
import { verifiveToken } from '../middlewar/authCatch.js'
import { authorizeRoles } from '../middlewar/adminCatch.js'

const UserController = express.Router()

UserController.get(
  '/seller-pending',
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
UserController.get(
  '/search',
  verifiveToken,
  authorizeRoles('admin'),
  asynchandler(async (req, res) => {

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

UserController.get(
  '/',
  verifiveToken,
  asynchandler(async (req, res) => {

    const user = await User.findById(req.user.id || req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  })
);


UserController.put('/approve-seller/:id', verifiveToken, authorizeRoles('admin'), asynchandler(async (req, res) => {
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
  




UserController.put('/update-profile/:id', verifiveToken, asynchandler(async (req, res) => {

    const { id } = req.params
    const { name, phone } = req.body

    const user = await User.findById(id)

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


UserController.put(
    '/suspend-seller/:id',
    verifiveToken,
    authorizeRoles('admin'),
    asynchandler(async (req, res) => {

      const { id } = req.params;

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