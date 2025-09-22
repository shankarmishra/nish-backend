import Notification from '../models/notification.model.js';
import { asyncHandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Create notification
export const createNotification = asyncHandler(async (req, res) => {
  const { notificationType } = req.body;
  if (!['alert', 'remark', 'update'].includes(notificationType)) {
    throw new ApiError(400, 'Invalid notificationType. Must be "remark", "alert" or "update".');
  }

  const notification = await Notification.create(req.body);
  return res.status(201).json(new ApiResponse(201, notification, 'Notification created'));
});

// Update notification status OR delete if dismissed
export const updateNotificationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status === 'dismissed') {
    const deleted = await Notification.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(404, 'Notification not found');
    return res.status(200).json(new ApiResponse(200, {}, 'Notification dismissed and deleted'));
  }

  const updated = await Notification.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!updated) throw new ApiError(404, 'Notification not found');

  return res.status(200).json(new ApiResponse(200, updated, 'Notification updated'));
});

// Get all notifications for a specific order
export const getOrderNotifications = async (req, res) => {
  const { orderId } = req.params;
  try {
    const notifications = await Notification.find({ 'data.orderId': orderId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    console.error("Error fetching order notifications:", err);
    res.status(500).json({ message: 'Error fetching order notifications', error: err.message });
  }
};
//Get all notifications of user
export const getUserNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const notifications = await Notification.find({ recipientId: userId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, notifications, 'User notifications fetched'));
});