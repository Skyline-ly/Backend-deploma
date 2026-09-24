
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Order } from "../model/Order.js";
import { Cart } from "../model/cart.js";
import { Product } from "../model/Product.js";
import { User } from "../model/User.js";


export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const { pickupInfo } = req.body;

  if (
    !pickupInfo ||
    !pickupInfo.location ||
    pickupInfo.location.trim() === ""
  ) {
    return res.status(400).json({
      success: false,
      message: "Pickup location is required",
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      
      const cart = await Cart.findOne({
        customer: userId,
      }).session(session);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Your cart is empty");
        error.statusCode = 400;
        throw error;
      }

      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = await Product.findOne({
          _id: cartItem.product,
          isActive: true,
        }).session(session);

        if (!product) {
          const error = new Error(
            "One or more products are no longer available"
          );
          error.statusCode = 400;
          throw error;
        }

        let price;
        let variantAttributes = {};
        let availableStock;

        if (product.variants && product.variants.length > 0) {
          if (!cartItem.variantId) {
            const error = new Error(
              `Please select a variant for ${product.name}`
            );
            error.statusCode = 400;
            throw error;
          }

          const variant = product.variants.id(cartItem.variantId);

          if (!variant) {
            const error = new Error(
              `Selected variant is unavailable for ${product.name}`
            );
            error.statusCode = 400;
            throw error;
          }

          price = variant.discountPrice ?? variant.price;
          availableStock = variant.stock;

          variantAttributes = Object.fromEntries(
            variant.attributes || new Map()
          );

          if (availableStock < cartItem.quantity) {
            const error = new Error(
              `Insufficient stock for ${product.name}`
            );
            error.statusCode = 400;
            throw error;
          }

         
          variant.stock -= cartItem.quantity;
        }

       
        else {
          price = product.discountPrice ?? product.basePrice;
          availableStock = product.stock;

          if (availableStock < cartItem.quantity) {
            const error = new Error(
              `Insufficient stock for ${product.name}`
            );
            error.statusCode = 400;
            throw error;
          }

        
          product.stock -= cartItem.quantity;
        }

        const itemSubtotal = price * cartItem.quantity;

        subtotal += itemSubtotal;

    
        const seller = await User.findById(product.seller)
          .select("_id")
          .session(session);

        if (!seller) {
          const error = new Error(
            `Seller not found for ${product.name}`
          );
          error.statusCode = 400;
          throw error;
        }

       
        orderItems.push({
          product: product._id,
          seller: seller._id,
          variantId: cartItem.variantId || null,
          productName: product.name,
          variantAttributes,
          image: product.images?.[0]?.url || null,
          price,
          quantity: cartItem.quantity,
          subtotal: itemSubtotal,
        });

        await product.save({ session });
      }

  
      const [order] = await Order.create(
        [
          {
            customer: userId,
            items: orderItems,
            subtotal,
            totalAmount: subtotal,
            pickupInfo: {
              location: pickupInfo.location.trim(),
              note: pickupInfo.note?.trim() || null,
            },
            status: "Pending",
          },
        ],
        { session }
      );

      createdOrder = order;

    
      cart.items = [];
      await cart.save({ session });
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: createdOrder,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  } finally {
    await session.endSession();
  }
});


export const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const {
    page = 1,
    limit = 10,
    status,
  } = req.query;

  const query = {
    customer: userId,
  };

  if (status) {
    query.status = status;
  }

  const options = {
    page: Number(page),
    limit: Number(limit),
    sort: {
      createdAt: -1,
    },
  };

  const orders = await Order.paginate(query, options);

  return res.status(200).json({
    success: true,
    data: orders,
  });
});


export const getOrderById = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  const order = await Order.findById(id)
    .populate("customer", "name email phone")
    .populate("items.seller", "name email");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  const isCustomer = order.customer._id.toString() === userId.toString();

  const isSellerInOrder = order.items.some(
    (item) => item.seller._id.toString() === userId.toString()
  );

  const isAdmin = userRole === "admin";

  if (!isCustomer && !isSellerInOrder && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to view this order",
    });
  }

  return res.status(200).json({
    success: true,
    data: order,
  });
});


export const getSellerOrders = asyncHandler(async (req, res) => {
  const sellerId = req.user.userId;

  const {
    page = 1,
    limit = 10,
    status,
  } = req.query;

  const query = {
    "items.seller": sellerId,
  };

  if (status) {
    query.status = status;
  }

  const options = {
    page: Number(page),
    limit: Number(limit),
    sort: {
      createdAt: -1,
    },
  };

  const orders = await Order.paginate(query, options);

  return res.status(200).json({
    success: true,
    data: orders,
  });
});


export const updateOrderStatus = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;

  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    "Pending",
    "Paid",
    "Confirmed",
    "Processing",
    "Ready for Pickup",
    "Picked Up",
    "Completed",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  const isAdmin = userRole === "admin";

  const isSellerInOrder = order.items.some(
    (item) => item.seller.toString() === userId.toString()
  );

  if (!isAdmin && !isSellerInOrder) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to update this order",
    });
  }


  if (status === "Cancelled" && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only admin can cancel an order from this endpoint",
    });
  }


  if (
    ["Confirmed", "Processing", "Ready for Pickup", "Picked Up", "Completed"].includes(
      status
    ) &&
    !["Paid", "Confirmed", "Processing", "Ready for Pickup", "Picked Up"].includes(
      order.status
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Order must be paid before processing",
    });
  }


  if (order.status === "Completed") {
    return res.status(400).json({
      success: false,
      message: "Completed orders cannot be updated",
    });
  }

  order.status = status;

  if (status === "Completed") {
    order.completedAt = new Date();
  }

  if (status === "Cancelled") {
    order.cancelledAt = new Date();
  }

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: order,
  });
});



export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { cancellationReason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  const order = await Order.findOne({
    _id: id,
    customer: userId,
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

 
  const cancellableStatuses = ["Pending", "Paid"];

  if (!cancellableStatuses.includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: "This order can no longer be cancelled",
    });
  }

  order.status = "Cancelled";
  order.cancelledAt = new Date();
  order.cancellationReason = cancellationReason?.trim() || null;

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    data: order,
  });
});