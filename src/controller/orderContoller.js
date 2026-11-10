
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import { Order } from "../model/Order.js";
import { Cart } from "../model/cart.js";
import { Product } from "../model/Product.js";
import { User } from "../model/User.js";
import { Payment } from "../model/Payment.js";
import {
  CUSTOMER_ORDER_PROGRESS,
  ORDER_SALE_STATUSES,
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
} from "../constants/orderStatus.js";
import {
  createNotifications,
  notifyAdmins,
} from "../service/notifications.js";
import { applyCreatedAtRange, getCreatedAtRange } from "../utils/dateRange.js";

async function restoreOrderStock(order, session) {
  if (!order.stockDeducted) return;

  for (const item of order.items) {
    const product = await Product.findById(item.product).session(session);
    if (!product) continue;

    if (item.variantId) {
      const variant = product.variants.id(item.variantId);
      if (variant) variant.stock += item.quantity;
    } else if (product.variants.length === 0) {
      product.stock += item.quantity;
    }
    await product.save({ session });
  }
}


export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const { deliveryInfo } = req.body;
  const paymentMethod = req.body.paymentMethod || "COD";

  if (!["COD", "PayWay"].includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: "Payment method must be COD or PayWay",
    });
  }

  if (
    !deliveryInfo ||
    typeof deliveryInfo.address !== "string" ||
    !deliveryInfo.address.trim() ||
    typeof deliveryInfo.phone !== "string" ||
    !deliveryInfo.phone.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Delivery address and phone number are required",
    });
  }

  if (deliveryInfo.address.trim().length > 500 || deliveryInfo.phone.trim().length > 30) {
    return res.status(400).json({
      success: false,
      message: "Delivery address or phone number is too long",
    });
  }
  if (deliveryInfo.note !== undefined && (
    typeof deliveryInfo.note !== "string" || deliveryInfo.note.length > 500
  )) {
    return res.status(400).json({
      success: false,
      message: "Delivery note must be 500 characters or fewer",
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      
      const cart = await Cart.findOne({
        customer: userId,
      }).session(session);

      const customer = await User.findById(userId)
        .select("name email")
        .session(session);

      if (!customer) {
        const error = new Error("Customer account not found");
        error.statusCode = 404;
        throw error;
      }

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
            deliveryInfo: {
              name: customer.name,
              email: customer.email,
              phone: deliveryInfo.phone.trim(),
              address: deliveryInfo.address.trim(),
              note: deliveryInfo.note?.trim() || null,
            },
            paymentMethod,
            paymentStatus: "Pending",
            stockDeducted: true,
            status: "Pending",
          },
        ],
        { session }
      );

      for (const cartItem of cart.items) {
        const product = await Product.findById(cartItem.product).session(session);
        if (!product) {
          const error = new Error("One or more products are no longer available");
          error.statusCode = 409;
          throw error;
        }

        if (cartItem.variantId) {
          const variant = product.variants.id(cartItem.variantId);
          if (!variant || variant.stock < cartItem.quantity) {
            const error = new Error(`Insufficient stock for ${product.name}`);
            error.statusCode = 409;
            throw error;
          }
          variant.stock -= cartItem.quantity;
        } else {
          if (product.variants.length > 0 || product.stock < cartItem.quantity) {
            const error = new Error(`Insufficient stock for ${product.name}`);
            error.statusCode = 409;
            throw error;
          }
          product.stock -= cartItem.quantity;
        }
        await product.save({ session });
      }

      await Payment.create(
        [
          {
            order: order._id,
            customer: userId,
            amount: subtotal,
            currency: "USD",
            method: paymentMethod,
            gateway: paymentMethod === "PayWay" ? "ABA PayWay" : "Cash on Delivery",
            status: "Pending",
          },
        ],
        { session }
      );

      const sellerIds = [
        ...new Set(orderItems.map((item) => item.seller.toString())),
      ];
      const orderNumber = order._id.toString().slice(-8).toUpperCase();
      await createNotifications(
        sellerIds,
        {
          type: "new_order",
          title: "New order received",
          message: `Order #${orderNumber} includes items from your shop.`,
          href: "/seller/orders",
        },
        session
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

  if (
    status !== undefined &&
    status !== "" &&
    (typeof status !== "string" || !ORDER_STATUSES.includes(status))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status filter",
    });
  }

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

export const getAdminOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const { range, error } = getCreatedAtRange(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }
  const query = applyCreatedAtRange({}, range);

  if (typeof req.query.status === "string" && req.query.status) {
    if (!ORDER_STATUSES.includes(req.query.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status filter",
      });
    }
    query.status = req.query.status;
  } else if (req.query.status !== undefined && req.query.status !== "") {
    return res.status(400).json({
      success: false,
      message: "Invalid order status filter",
    });
  }

  const orders = await Order.paginate(query, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: [
      { path: "customer", select: "name email" },
      { path: "items.seller", select: "name email" },
    ],
  });

  return res.status(200).json({
    success: true,
    data: orders,
  });
});

export const getOrderStatusOptions = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      statuses: ORDER_STATUSES,
      transitions: ORDER_STATUS_TRANSITIONS,
      customerProgress: CUSTOMER_ORDER_PROGRESS,
    },
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

  if (
    status !== undefined &&
    status !== "" &&
    (typeof status !== "string" || !ORDER_STATUSES.includes(status))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status filter",
    });
  }

  const query = {
    "items.seller": sellerId,
  };
  const { range, error } = getCreatedAtRange(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }
  applyCreatedAtRange(query, range);

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
      select: "name email phone",
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

  const [report] = await Order.aggregate([
    {
      $match: {
        status: { $in: ORDER_SALE_STATUSES },
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

  if (userRole !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Only sellers can update order status",
    });
  }

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

  const isSellerInOrder = order.items.some(
    (item) => item.seller.toString() === userId.toString()
  );

  if (!isSellerInOrder) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to update this order",
    });
  }

  if (order.paymentMethod === "PayWay" && order.paymentStatus !== "Paid") {
    return res.status(400).json({
      success: false,
      message: "The customer must complete PayWay payment before this order can be processed",
    });
  }

  const nextStatus = ORDER_STATUS_TRANSITIONS[order.status];

  if (status !== nextStatus) {
    return res.status(400).json({
      success: false,
      message: `Invalid order status transition from ${order.status} to ${status}`,
    });
  }

  if (status === "Success") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const updatedOrder = await Order.findOneAndUpdate(
          { _id: id, status: { $in: ["Out for Delivery", "Delivered"] } },
          {
            $set: {
              status: "Success",
              paymentStatus: "Paid",
              completedAt: new Date(),
            },
          },
          { new: true, session, runValidators: true }
        );

        if (!updatedOrder) {
          const error = new Error("Order status changed before completion");
          error.statusCode = 409;
          throw error;
        }

        const payment = await Payment.findOneAndUpdate(
          { order: id, status: "Pending" },
          { $set: { status: "Paid", paidAt: new Date() } },
          { new: true, session }
        );

        if (!payment && updatedOrder.paymentMethod === "COD") {
          await Payment.create(
            [
              {
                order: updatedOrder._id,
                customer: updatedOrder.customer,
                amount: updatedOrder.totalAmount,
                currency: "USD",
                method: "COD",
                gateway: "Cash on Delivery",
                status: "Paid",
                paidAt: new Date(),
              },
            ],
            { session }
          );
        }
        await createNotifications(
          updatedOrder.items.map((item) => item.seller),
          {
            type: "order_status",
            title: "Order status updated",
            message: `Order #${updatedOrder._id.toString().slice(-8).toUpperCase()} is now ${status}.`,
            href: "/seller/orders",
          },
          session
        );
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to complete order",
      });
    } finally {
      await session.endSession();
    }

    const completedOrder = await Order.findById(id);
    return res.status(200).json({
      success: true,
      message: "Order completed and cash-on-delivery payment recorded",
      data: completedOrder,
    });
  }

  const session = await mongoose.startSession();
  let updatedOrder;
  try {
    await session.withTransaction(async () => {
      updatedOrder = await Order.findOneAndUpdate(
        { _id: id, status: order.status },
        { $set: { status } },
        { new: true, runValidators: true, session }
      );
      if (!updatedOrder) {
        const error = new Error("Order status changed before it could be updated");
        error.statusCode = 409;
        throw error;
      }

      await createNotifications(
        updatedOrder.items.map((item) => item.seller),
        {
          type: "order_status",
          title: "Order status updated",
          message: `Order #${updatedOrder._id.toString().slice(-8).toUpperCase()} is now ${status}.`,
          href: "/seller/orders",
        },
        session
      );
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update order status",
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: updatedOrder,
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

  const session = await mongoose.startSession();

  try {
    let cancelledOrder;
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: id,
        customer: userId,
      }).session(session);

      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      if (order.status !== "Pending") {
        const error = new Error("Only pending orders can be cancelled");
        error.statusCode = 400;
        throw error;
      }

      cancelledOrder = await Order.findOneAndUpdate(
        { _id: id, customer: userId, status: "Pending" },
        {
          $set: {
            status: "Cancelled",
            cancelledAt: new Date(),
            stockDeducted: false,
            paymentStatus: "Cancelled",
            cancellationReason:
              typeof cancellationReason === "string"
                ? cancellationReason.trim() || null
                : null,
          },
        },
        { new: true, session }
      );
      if (!cancelledOrder) {
        const error = new Error("Order status changed before it could be cancelled");
        error.statusCode = 409;
        throw error;
      }

      await restoreOrderStock(order, session);
      await Payment.updateMany(
        { order: id, status: "Pending" },
        { $set: { status: "Cancelled" } },
        { session }
      );
      const sellerIds = [
        ...new Map(
          order.items.map((item) => [item.seller.toString(), item.seller])
        ).values(),
      ];
      const orderNumber = order._id.toString().slice(-8).toUpperCase();
      const cancellationNotification = {
        type: "order_cancelled",
        title: "Order cancelled",
        message: `Order #${orderNumber} was cancelled by the customer.`,
        href: "/seller/orders",
      };
      await createNotifications(sellerIds, cancellationNotification, session);
      await notifyAdmins(
        { ...cancellationNotification, href: "/admin/orders" },
        session
      );
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: cancelledOrder,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to cancel order",
    });
  } finally {
    await session.endSession();
  }
});