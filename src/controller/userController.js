
import asynchandler from 'express-async-handler'
import { User } from '../model/User.js'
import { notifyAdmins } from '../service/notifications.js'
import { applyCreatedAtRange, getCreatedAtRange } from "../utils/dateRange.js";

export const userPending = asynchandler(async (req, res) => {
  const { range, error } = getCreatedAtRange(req.query)
  if (error) {
    return res.status(400).json({ success: false, message: error })
  }
  const query = applyCreatedAtRange({
    role: 'customer',
    sellerStatus: 'pending'
  }, range)
  const sellers = await User.find(query).select('-password');

  return res.status(200).json({
    success: true,
    count: sellers.length,
    data: sellers
  });
})
  ;

export const searchUser = asynchandler(async (req, res) => {
  const { search, sellerStatus, role } = req.query;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit, 10) || 10)
  );

  const query = {}
  const { range, error } = getCreatedAtRange(req.query)
  if (error) {
    return res.status(400).json({ success: false, message: error })
  }
  applyCreatedAtRange(query, range)

  if (typeof search === 'string' && search.trim()) {
    query.name = { $regex: search.trim(), $options: 'i' }
  }
  if (typeof sellerStatus === 'string' && sellerStatus) {
    query.sellerStatus = sellerStatus
  }

  if (typeof role === 'string' && role) {
    query.role = role
  }
  const user = await User.paginate(query, { page, limit, select: '-password' })
  return res.status(200).json({
    success: true,
    data: user
  })

}
);

export const approveUser = asynchandler(async (req, res) => {
  const { id } = req.params

  const user = await User.findById(id)

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }
  if (user.sellerStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'User seller status is not pending'
    })
  }

  user.role = 'seller'
  user.sellerStatus = 'approved'

  await user.save()
  return res.status(200).json({
    success: true,
    message: "Seller approved successfully",
    data: {
      id: user._id,
      name: user.name,
      role: user.role,
      sellerStatus: user.sellerStatus
    }
  });
});


export const unsuspendUser = asynchandler(async (req, res) => {

  const { id } = req.params

  const user = await User.findById(id)

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  if (
    user.role !== 'seller' ||user.sellerStatus !== 'suspended'
  ) {
    return res.status(400).json({
      success: false,
      message: 'User is not a suspended seller'
    });
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
});

export const unrejectUser = asynchandler(async (req, res) => {

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
  ;
export const getMyProfile = asynchandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "name email phone role sellerStatus avatar createdAt"
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
});

export const userProfile = asynchandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const { name, phone } = req.body;

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty",
      });
    }

    user.name = name.trim();
  }

  if (phone !== undefined) {
    if (typeof phone !== "string") {
      return res.status(400).json({
        success: false,
        message: "Phone must be a string",
      });
    }

    user.phone = phone.trim();
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      sellerStatus: user.sellerStatus,
      avatar: user.avatar,
    },
  });
});

export const rejectUser = asynchandler(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id)

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
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



});


export const suspendUser = asynchandler(async (req, res) => {

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
}
);

export const becomeSeller = asynchandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: "Your account is inactive",
    });
  }

  if (user.role === "seller") {
    return res.status(400).json({
      success: false,
      message: "You are already a seller",
    });
  }

  if (user.sellerStatus === "pending") {
    return res.status(400).json({
      success: false,
      message: "Your seller application is already pending",
    });
  }

  if (user.sellerStatus === "approved") {
    return res.status(400).json({
      success: false,
      message: "Your seller application is already approved",
    });
  }

  const {
    shopName,
    shopLocation,
    phone,
    cardId,
  } = req.body;

  if (
    [shopName, shopLocation, phone, cardId].some(
      (value) => typeof value !== "string" || !value.trim()
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all required information",
    });
  }

  const avatarFile = req.files?.avatar?.[0];
  const idCardFile = req.files?.idCardPhoto?.[0];

  if (!avatarFile || !idCardFile) {
    return res.status(400).json({
      success: false,
      message: "Profile photo and identity card photo are required",
    });
  }

  user.phone = phone.trim();

  user.avatar = {
    url: avatarFile.path,
    publicId: avatarFile.filename,
  };

  user.sellerApplication = {
    shopName: shopName.trim(),
    shopLocation: shopLocation.trim(),
    cardId: cardId.trim(),

    idCardPhoto: {
      url: idCardFile.path,
      publicId: idCardFile.filename,
    },

    submittedAt: new Date(),
  };

  user.sellerStatus = "pending";

  const session = await User.startSession();
  try {
    await session.withTransaction(async () => {
      await user.save({ session });
      await notifyAdmins(
        {
          type: "new_seller_application",
          title: "New seller application",
          message: `${user.name} submitted a seller application.`,
          href: "/admin/sellers",
        },
        session
      );
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json({
    success: true,
    message: "Seller application submitted successfully",
    data: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      sellerStatus: user.sellerStatus,
      sellerApplication: {
        shopName: user.sellerApplication.shopName,
        shopLocation: user.sellerApplication.shopLocation,
        submittedAt: user.sellerApplication.submittedAt,
      },
    },
  });
});