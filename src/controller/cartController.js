import asyncHandler from "express-async-handler";

import { Product } from "../model/Product.js";
import { Cart } from "../model/cart.js";

export const addCartItem = asyncHandler(async (req, res) => {
  const {
    productId,
    variantId,
    quantity = 1,
  } = req.body;

  const userId = req.user.userId;


  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  
  if (!productId || !variantId) {
    return res.status(400).json({
      success: false,
      message: "Product and variant are required",
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
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }


  const variant = product.variants.id(variantId);

  if (!variant) {
    return res.status(404).json({
      success: false,
      message: "Variant is not related to this product",
    });
  }

  
  if (variant.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${variant.stock} items available`,
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

cart.items.push({
  product: productId,
  variantId,
  quantity,
});

await cart.save();

  await cart.save();

  return res.status(201).json({
    success: true,
    message: "Product added to cart",
    cart,
  });
});

export const deleteCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userId = req.user.userId;

  const cart = await Cart.findOne({ customer: userId });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Cart not found",
    });
  }
  console.log('=======find bug====')

  const item =cart.items.id(id);
  console.log('=======find bug====',item)

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found in cart",
    });
  }
  console.log('=======find bug====')

  item.deleteOne();

  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: cart,
  });
});
export const getCartItems = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const cart = await Cart.findOne({ customer: userId })

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Cart not found",
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

  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be at least 1",
    });
  }

  const userId = req.user.userId;

  const cart = await Cart.findOne({ customer: userId });

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

  const product = await Product.findById(item.product);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const variant = product.variants.id(item.variantId);

  if (!variant) {
    return res.status(404).json({
      success: false,
      message: "Variant is not related to this product",
    });
  }

  if (variant.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${variant.stock} items available`,
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