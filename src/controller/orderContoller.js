
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
          approvalStatus: { $in: ["approved", null] },
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

        }

        const itemSubtotal = price * cartItem.quantity;

        subtotal += itemSubtotal;

    
        const seller = await User.findOne({
          _id: product.seller,
          role: "seller",
          sellerStatus: "approved",
          isActive: true,
        })
          .select("_id")
          .session(session);

        if (!seller) {
          const error = new Error(
            `${product.name} is unavailable because its seller is not active`
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
    populate: {
      path: "customer",
      select: "name",
    },
  };

  const orders = await Order.paginate(query, options);
  const sellerOrders = orders.docs.map((order) => {
    const sellerOrder = order.toObject();
    sellerOrder.items = sellerOrder.items.filter(
      (item) => item.seller.toString() === sellerId.toString()
    );
    sellerOrder.sellerSubtotal = sellerOrder.items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );
    delete sellerOrder.subtotal;
    delete sellerOrder.totalAmount;
    return sellerOrder;
  });

  return res.status(200).json({
    success: true,
    data: {
      ...orders,
      docs: sellerOrders,
    },
  });
});

export const getSellerSales = asyncHandler(async (req, res) => {
  const sellerId = new mongoose.Types.ObjectId(req.user.userId);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Page must be positive and limit must be between 1 and 100",
    });
  }

  const saleStatuses = [
    "Paid",
    "Packing",
    "In Transit",
    "Delivered",
    "Completed",
    "Confirmed",
    "Processing",
    "Ready for Pickup",
    "Picked Up",
  ];

  const [report] = await Order.aggregate([
    {
      $match: {
        status: { $in: saleStatuses },
        "items.seller": sellerId,
      },
    },
    { $unwind: "$items" },
    { $match: { "items.seller": sellerId } },
    {
      $facet: {
        products: [
          {
            $group: {
              _id: "$items.product",
              productName: { $first: "$items.productName" },
              unitsSold: { $sum: "$items.quantity" },
              grossSales: { $sum: "$items.subtotal" },
              orderIds: { $addToSet: "$_id" },
            },
          },
          {
            $project: {
              _id: 0,
              productId: "$_id",
              productName: 1,
              unitsSold: 1,
              grossSales: 1,
              orderCount: { $size: "$orderIds" },
            },
          },
          { $sort: { grossSales: -1, productName: 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        metadata: [
          { $group: { _id: "$items.product" } },
          { $count: "totalDocs" },
        ],
        summary: [
          {
            $group: {
              _id: null,
              unitsSold: { $sum: "$items.quantity" },
              grossSales: { $sum: "$items.subtotal" },
              orderIds: { $addToSet: "$_id" },
            },
          },
          {
            $project: {
              _id: 0,
              unitsSold: 1,
              grossSales: 1,
              orderCount: { $size: "$orderIds" },
            },
          },
        ],
      },
    },
  ]);

  const products = report?.products || [];
  const totalDocs = report?.metadata?.[0]?.totalDocs || 0;
  const summary = report?.summary?.[0] || {
    unitsSold: 0,
    grossSales: 0,
    orderCount: 0,
  };

  return res.status(200).json({
    success: true,
    data: products,
    summary,
    pagination: {
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
    },
  });
});


export const updateOrderStatus = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;

  const { id } = req.params;
  const { status } = req.body;

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

  if (userRole === "seller" && !isSellerInOrder) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to update this order",
    });
  }

  const nextStatus = {
    Paid: "Packing",
    Packing: "In Transit",
    "In Transit": "Delivered",
   
    Confirmed: "Processing",
    Processing: "Ready for Pickup",
    "Ready for Pickup": "Picked Up",
  }[order.status];

  if (status === "Paid") {
    return res.status(403).json({
      success: false,
      message: "Only verified payment can mark an order as paid",
    });
  }

  if (status === "Completed") {
    return res.status(400).json({
      success: false,
      message: "The customer must confirm receipt to complete the order",
    });
  }

  if (status === "Cancelled") {
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only an admin can cancel an order from this endpoint",
      });
    }
    if (order.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be cancelled",
      });
    }

    const cancelledOrder = await Order.findOneAndUpdate(
      { _id: id, status: "Pending" },
      { $set: { status: "Cancelled", cancelledAt: new Date() } },
      { new: true }
    );
    if (!cancelledOrder) {
      return res.status(409).json({
        success: false,
        message: "Order status changed before it could be cancelled",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: cancelledOrder,
    });
  }

  if (!["seller", "admin"].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to update this order",
    });
  }

  if (status !== nextStatus) {
    return res.status(400).json({
      success: false,
      message: `Invalid order status transition from ${order.status} to ${status}`,
    });
  }

  order.status = status;

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: order,
  });
});

export const confirmOrderReceived = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  const order = await Order.findOne({
    _id: id,
    customer: req.user.userId,
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (order.status !== "Delivered") {
    return res.status(400).json({
      success: false,
      message: "You can confirm receipt after the order is marked as delivered",
    });
  }

  order.status = "Completed";
  order.completedAt = new Date();
  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order receipt confirmed",
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

  if (order.status !== "Pending") {
    return res.status(400).json({
      success: false,
      message: "Only pending orders can be cancelled",
    });
  }

  const cancelledOrder = await Order.findOneAndUpdate(
    { _id: id, customer: userId, status: "Pending" },
    {
      $set: {
        status: "Cancelled",
        cancelledAt: new Date(),
        cancellationReason: cancellationReason?.trim() || null,
      },
    },
    { new: true }
  );
  if (!cancelledOrder) {
    return res.status(409).json({
      success: false,
      message: "Order status changed before it could be cancelled",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    data: cancelledOrder,
  });
});