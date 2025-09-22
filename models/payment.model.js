import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider",
    required: true,
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },

  // Internal order reference (your DB)
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },

  // Cashfree order reference
  cfOrderId: {
    type: String, // Cashfree order_id
  },

  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "INR",
  },

  method: {
    type: String,
    enum: ["cashfree", "cod"],
    default: "cashfree",
  },

  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },

  address: { type: String, required: true },
  appointmentSlot: { type: String, required: true },
  tempDocs: [String],
}, { timestamps: true });

export default mongoose.model("Payment", PaymentSchema);
