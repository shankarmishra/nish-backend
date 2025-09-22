import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { asyncHandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import Payment from "../models/payment.model.js";
// GET /api/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id)
    .populate("user", "userName email phone")
    .populate("serviceId")
    .populate("providerId");
  if (!order) throw new ApiError(404, "Order not found");
  return res.status(200).json(new ApiResponse(200, order, "Order fetched"));
});

// GET /api/orders/user/:userId
export const getOrdersByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("providerId serviceId");
  return res
    .status(200)
    .json(new ApiResponse(200, orders, "User orders fetched"));
});

// GET /api/orders/provider/:providerId
export const getOrdersByProvider = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const { status, q ,dateFilter} = req.query;
  const conditions = { providerId };
  if (status && status !== "all") {
    conditions.status = status;
  }


console.log(req.query);

  // Optional server-side search by user name or email
  if (q && typeof q === "string" && q.trim().length > 0) {

    const regex = new RegExp(q.trim(), "i");

    const matchingUsers = await User.find({
      $or: [{
        userName: regex
      }, {
        email: regex

      }],
    }).select("_id");

    const userIds = matchingUsers.map((u) => u._id);

    if (!userIds.length) {
      return res.status(200).json(
        new ApiResponse(
          200,
          { orders: [], totalPages: 0, currentPage: page, totalOrders: 0 },
          "Provider orders fetched"
        )
      );
    }
    conditions.user = { $in: userIds };
  }

// add date base filter 
if (dateFilter) {
  const startDate = new Date(dateFilter.startDate);
  const endDate = new Date(dateFilter.endDate);

  // shift endDate to the end of the day 
  endDate.setUTCHours(23, 59, 59, 999);

  conditions.createdAt = {
    $gte: startDate,
    $lte: endDate,
  };
}

  const totalOrders = await Order.countDocuments(conditions);
  const orders = await Order.find(conditions)
    .populate("user serviceId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .populate("user", "userName email")
    .populate("serviceId", "title")
    .limit(limit);


  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      totalOrders,
    }, "Provider orders fetched")
  );
});

// PUT /api/orders/:id
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params; // Order ID
  const { status, providerId } = req.body; // New status and Provider ID

  const validStatuses = ["pending", "received", "generated", "out_for_delivery", "delivered","example"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  if (!providerId) {
    throw new ApiError(400, "Provider ID is required");
  }
  // Find order with matching order ID and provider ID
  const order = await Order.findOne({ _id: id, providerId }).populate('serviceId');
  if (!order) {
    throw new ApiError(404, "Order not found or you do not have permission to update it.");
  }

  // Update status and timestamp
  order.status = status;

  const statusTimestampField = status === "out_for_delivery" ? "dispatchedAt" : `${status}At`;

  if (order.timestamps && statusTimestampField) {
    order.timestamps[statusTimestampField] = new Date();
  }
  await order.save();

  // Fire-and-forget notification creation; don't block response on failure
  try {
    if (order.user) {
      await Notification.create({
        recipientId: order.user,
        recipientType: "user",
        senderId: providerId,
        senderType: "producer",
        title: "Order Status Updated",
        message: `Your order for ${order.serviceId.title} (#${order._id}) has been updated to ${status}.`,
        notificationType: "update",
        data: { orderId: order._id, status },
      });
    }
  } catch (notifErr) {
    console.error("Error creating notification:", notifErr);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated"));
});

// POST /api/orders/provider/bulk-status
export const updateOrdersStatusBulk = asyncHandler(async (req, res) => {
  const { providerId, updates } = req.body;
  if (!providerId) throw new ApiError(400, "Provider ID is required");
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ApiError(400, "Updates array is required");
  }

  const validStatuses = ["pending", "received", "generated", "out_for_delivery", "delivered"];

  const results = await Promise.allSettled(
    updates.map(async (u) => {
      const { orderId, status } = u || {};
      if (!orderId || !status || !validStatuses.includes(status)) {
        throw new Error("Invalid orderId/status");
      }
      const order = await Order.findOne({ _id: orderId, providerId });
      if (!order) throw new Error("Order not found or no permission");

      order.status = status;
      const statusTimestampField = status === "out_for_delivery" ? "dispatchedAt" : `${status}At`;
      if (order.timestamps && statusTimestampField) {
        order.timestamps[statusTimestampField] = new Date();
      }
      await order.save();

      // Best-effort notification
      try {
        if (order.user) {
          await Notification.create({
            recipientId: order.user,
            recipientType: "user",
            senderId: providerId,
            senderType: "producer",
            title: "Order Status Updated",
            message: `Your order #${order._id} status changed to ${status}.`,
            notificationType: "update",
            data: { orderId: order._id, status },
          });
        }
      } catch (e) {
        // ignore notification errors in bulk
      }

      return { _id: order._id, status };
    })
  );

  const updated = [];
  const failed = [];
  results.forEach((r, idx) => {
    const target = updates[idx]?.orderId;
    if (r.status === "fulfilled") updated.push(r.value);
    else failed.push({ orderId: target, error: r.reason?.message || "Unknown error" });
  });

  return res.status(200).json(
    new ApiResponse(200, { updated, failed }, "Bulk order status update processed")
  );
});

// PUT /api/orders/provider/:id/application-id

// Add a labeled application identifier
export const addOrderApplicationIdentifier = asyncHandler(async (req, res) => {
  const { id } = req.params; // Order ID
  const { data, providerId } = req.body;
  if (!providerId) throw new ApiError(400, "Provider ID is required");
  console.log(data);


  const order = await Order.findOne({ _id: id, providerId });
  if (!order) throw new ApiError(404, "Order not found or you do not have permission to update it.");
  if (!Array.isArray(order.applicationIds)) order.applicationIds = [];

  if (Array.isArray(data)) {
    order.applicationIds.push(...data);// spread array into multiple elements
  } else {
    order.applicationIds.push(data);
  }

  await order.save();
  return res.status(200).json(new ApiResponse(200, order, "Application identifier added"));
});

// Get all application identifiers for an order
export const getOrderApplicationIdentifiers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id).select("applicationIds");
  if (!order) throw new ApiError(404, "Order not found");
  return res.status(200).json(new ApiResponse(200, order.applicationIds || [], "Application identifiers fetched"));
});
// ✅ Create Order
export const createOrder = asyncHandler(async (req, res) => {
  const {
    userId,
    providerId,
    serviceId,
    totalAmount,
    address,
    appointmentSlot,
    customerName,
    customerEmail,
    customerPhone,
    pincode,
    city,
    district,
    stateName,
    country,
    uploadedDocs = [],
  } = req.body;

  // Basic validation
  if (
    !userId ||
    !providerId ||
    !serviceId ||
    !totalAmount ||
    !address ||
    !appointmentSlot ||
    !customerName ||
    !customerEmail ||
    !customerPhone ||
    !pincode
  ) {
    throw new ApiError(400, "Missing required fields");
  }

  const newOrder = new Order({
    user: userId,
    providerId,
    serviceId,
    totalAmount,
    status: "pending",
    address,
    appointmentSlot,
    customerName,
    customerEmail,
    customerPhone,
    pincode,
    city,
    district,
    stateName,
    country,
    uploadedDocs,
  });

  const savedOrder = await newOrder.save();
  return res
    .status(201)
    .json(new ApiResponse(201, { order: savedOrder }, "Order created successfully"));
});

// GET /api/orders/invoice/:orderId
export const getInvoice = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "Order ID is required");
  }

  const invoice = await Payment.findOne({ orderId: orderId })
    .populate("userId", "userName email")
    .populate("providerId", "name")
    .populate("serviceId", "title");

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  return res.status(200).json(new ApiResponse(200, invoice, "Invoice sent"));
});
