import { Router } from "express";
import {
  createNotification,
  getUserNotifications,
  updateNotificationStatus,
  getOrderNotifications
} from '../controllers/notification.controller.js';

const router = Router();

router.post('/', createNotification);
router.get('/:userId', getUserNotifications);
router.put('/:id/status', updateNotificationStatus); // ✅ update/dismiss
router.get('/order/:orderId', getOrderNotifications); // ✅ get by order

export { router as notificationRouter };
