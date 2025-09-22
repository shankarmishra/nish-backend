// models/Transaction.js
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },

    provider: { type: String, default: "Cashfree" },

    // Cashfree order id for this attempt (unique per try)
    gatewayOrderId: { type: String, required: true },

    // Cashfree payment id (known after success/failure callback or fetch)
    transactionId: { type: String },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: false,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending",
    },
    // identifiers
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
        required: true
    },

    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    },
    // helpful for audits
    rawResponse: { type: Object },
}, { timestamps: true });

export default mongoose.model("Transaction", TransactionSchema);
