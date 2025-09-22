import { Router } from "express";
import {
    getOrdersByUser,
    getOrdersByProvider,
    updateOrderStatus,
    createOrder,
    updateOrdersStatusBulk,
    getOrderById,
    addOrderApplicationIdentifier,
    getOrderApplicationIdentifiers,
    getInvoice,
} from "../controllers/order.controller.js";

const router = Router();

router.post("/", createOrder);
router.get("/:id", getOrderById);
// Route for users to get their orders
router.route("/user/:userId").get(getOrdersByUser);


router.get("/user/invoice/:orderId", getInvoice);

// Route for providers to get orders assigned to them
router.route("/provider/:providerId").get(getOrdersByProvider);

// Route for providers to update order status
router.route("/provider/:id").put(updateOrderStatus);

// Route for providers to set or update applicationId

// New routes for multiple application identifiers
router.route("/provider/:id/application-identifiers").post(addOrderApplicationIdentifier);
router.route("/provider/:id/application-identifiers").get(getOrderApplicationIdentifiers);

// Bulk status update for providers
router.route("/provider/bulk-status").post(updateOrdersStatusBulk);

export { router as orderRouter };