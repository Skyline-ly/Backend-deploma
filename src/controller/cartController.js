
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Product } from "../model/Product.js";
import { Cart } from "../model/cart.js";
import { User } from "../model/User.js";


export const addCartItem = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;

  const userId = req.user.userId;


  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }


  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      success: false,
      message: "A valid product ID is required",
    });
  }


  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be at least 1",
    });
  }

 
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    approvalStatus: { $in: ["approved", null] },
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const approvedSeller = await User.exists({
    _id: product.seller,
    role: "seller",
    sellerStatus: "approved",
    isActive: true,
  });

  if (!approvedSeller) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }


  let variant;
  let availableStock;

  if (product.variants.length > 0) {
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({
        success: false,
        message: "A valid variant ID is required for this product",
      });
    }

    variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant is not related to this product",
      });
    }
    availableStock = variant.stock;
  } else {
    if (variantId) {
      return res.status(400).json({
        success: false,
        message: "This product does not have variants",
      });
    }
    availableStock = product.stock;
  }

  if (availableStock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${availableStock} items available`,
    });
  }


  let cart = await Cart.findOne({
    customer: userId,
  });


  if (!cart) {
    cart = new Cart({
      customer: userId,
      items: [],
    });
  }

 
  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === productId.toString() &&
    (item.variantId?.toString() ?? null) === (variantId?.toString() ?? null)
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;


    if (newQuantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} items available`,
      });
    }

    existingItem.quantity = newQuantity;
  } else {
    
    cart.items.push({
      product: productId,
      ...(variantId ? { variantId } : {}),
      quantity,
    });
  }

  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Product added to cart",
    data: cart,
  });
});



export const getCartItems = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const cart = await Cart.findOne({
    customer: userId,
  }).populate({
    path: "items.product",
    select:
      "name basePrice discountPrice images variants seller condition",
    populate: {
      path: "seller",
      select: "name sellerStatus",
    },
  });


  if (!cart) {
    return res.status(200).json({
      success: true,
      message: "Cart is empty",
      data: {
        customer: userId,
        items: [],
      },
    });
  }

  return res.status(200).json({
    success: true,
    data: cart,
  });
});


export const updateCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  const userId = req.user.userId;


  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be at least 1",
    });
  }


  const cart = await Cart.findOne({
    customer: userId,
  });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Cart not found",
    });
  }


  const item = cart.items.id(id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found in cart",
    });
  }


  const product = await Product.findOne({
    _id: item.product,
    isActive: true,
    approvalStatus: { $in: ["approved", null] },
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product is no longer available",
    });
  }


  let availableStock;
  if (product.variants.length > 0) {
    const variant = item.variantId
      ? product.variants.id(item.variantId)
      : null;
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant is no longer available",
      });
    }
    availableStock = variant.stock;
  } else {
    if (item.variantId) {
      return res.status(400).json({
        success: false,
        message: "This product no longer has variants",
      });
    }
    availableStock = product.stock;
  }

  if (quantity > availableStock) {
    return res.status(400).json({
      success: false,
      message: `Only ${availableStock} items available`,
    });
  }


  item.quantity = quantity;

  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Cart item updated successfully",
    data: cart,
  });
});



export const deleteCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userId = req.user.userId;

 
  const cart = await Cart.findOne({
    customer: userId,
  });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Cart not found",
    });
  }


  const item = cart.items.id(id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found in cart",
    });
  }


  item.deleteOne();

  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: cart,
  });
});