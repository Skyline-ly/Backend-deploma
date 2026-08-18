export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied: Insufficient permissions" 
      });
    }

    next();
  };
};

// Usage in your routes:
// router.get('/admin/users', protect, authorizeRoles('admin'), getAllUsers);
// router.post('/seller/products', protect, authorizeRoles('admin', 'seller'), createProduct);