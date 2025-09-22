import mongoose, { Schema } from "mongoose";


const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    applicationIds: [{
      label: { type: String, required: true }, // e.g., "DL Update", "Passport Renewal"
      identifier: { type: String, required: true }, // actual application ID
      addedAt: { type: Date, default: Date.now },
    }],

    status: {
      type: String,
      enum: ["pending", "received", "generated", "out_for_delivery", "delivered"],
      default: "pending",
    },

    uploadedDocs: [String], // file URLs

    // Customer details
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },

    // Address fields
    pincode: { type: String, required: true },
    city: { type: String },
    district: { type: String },
    stateName: { type: String },
    country: { type: String },
    address: { type: String, required: true },

    // Appointment
    appointmentSlot: { type: String, required: true },

    // Payment
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },

    timestamps: {
      orderedAt: { type: Date, default: Date.now },
      generatedAt: Date,
      dispatchedAt: Date,
      deliveredAt: Date,
    },
  },
  {
    timestamps: true,
  }
);


export const Order = mongoose.model("Order", orderSchema);
