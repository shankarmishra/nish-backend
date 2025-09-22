import crypto from "crypto";
import Payment from "../models/payment.model.js";
import Transaction from "../models/transaction.model.js";
import { Order } from "../models/order.model.js";
import { cf, CF_BASE } from "../utils/cashfreeClient.js";


/**
 * 1) INITIATE a payment attempt (COD or Cashfree)
 */
export const initiatePayment = async (req, res, next) => {
  try {
    console.log("Incoming body:", req.body);
    const {
      userId, providerId, serviceId,
      amount, address, appointmentSlot,
      pincode, city, district, stateName, country,
      customerName, customerEmail, customerPhone,
      termsAccepted = true,//temperary
      method = "cashfree"
    } = req.body;
    console.log("Extracted variables:", { userId, providerId, serviceId, amount, address, appointmentSlot, termsAccepted, method });
    if (!termsAccepted) {
      console.log("termsAccepted is false, returning 400");
      return res.status(400).json({ message: "Accept terms & conditions" });
    }
    console.log("termsAccepted check passed");
    if (!userId || !providerId || !serviceId || !amount || !address || !appointmentSlot) {
      console.log("Missing required fields, returning 400");
      return res.status(400).json({ message: "Missing required fields" });
    }
    console.log("Required fields check passed");

    // ---------------- COD ----------------
    if (method === "cod") {
      console.log("Method is cod, processing COD payment");
      const payment = await Payment.create({
        userId,
        providerId,
        serviceId,
        amount,
        address,
        appointmentSlot,
        method: "cod",
        status: "pending",
        tempDocs: [],
      });
      console.log("Payment document created:", payment._id);

      const newOrder = await Order.create({
        user: userId,
        providerId,
        serviceId,
        address,
        pincode,
        city,
        district,
        stateName,
        country,
        appointmentSlot,
        totalAmount: amount,
        status: "received",
        payment: payment._id,
        customerName,
        customerEmail,
        customerPhone,
      });
      console.log("Order document created:", newOrder._id);

      payment.orderId = newOrder._id;
      console.log("Assigned orderId to payment:", payment.orderId);
      await payment.save();
      console.log("Payment document saved with updated orderId");

      // ✅ Create a Transaction record for COD
      await Transaction.create({
        paymentId: payment._id,
        provider: "COD",
        gatewayOrderId: `cod_${payment._id}_${Date.now()}`, // pseudo order id
        order: newOrder._id,
        amount: payment.amount,
        currency: "INR",
        status: "pending", // COD is initially pending until marked delivered/paid
        userId,
        providerId,
        serviceId,
        rawResponse: {},   // optional
      });
      console.log("Transaction document created for COD");

      return res.status(201).json({
        success: true,
        paid: false,
        paymentId: payment._id,
        order: newOrder
      });
    }
    console.log("Method is not cod, proceeding with online payment");

    // ---------------- ONLINE (Cashfree) ----------------
    const payment = await Payment.create({
      userId, providerId, serviceId,
      amount, address, appointmentSlot,
      pincode, city, district, stateName, country,
      customerName, customerEmail, customerPhone,
      status: "pending",
    });
    console.log("Payment document created:", payment._id);

    const gatewayOrderId = `cf_${payment._id}_${Date.now()}`;
    console.log("Generated gatewayOrderId:", gatewayOrderId);
 const returnUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/payment/success?paymentId=${userId}&order_id={order_id}`
      : `https://www.cashfree.com/devstudio/return?order_id={order_id}`;

    const payload = {
      order_id: gatewayOrderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_name: customerName || "NA",
        customer_email: customerEmail || "na@example.com",
        customer_phone: customerPhone || "9999999999",
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      },
      order_note: `service:${serviceId}`,
    };
    console.log("Payload prepared for Cashfree order creation:", payload);

    const { data: cfOrder } = await cf.post("/orders", payload);
    console.log("Cashfree order created:", cfOrder);

    payment.cfOrderId = cfOrder.order_id;
    console.log("Assigned cfOrderId to payment:", payment.cfOrderId);
    await payment.save();
    console.log("Payment document saved with cfOrderId");

    const txn = await Transaction.create({
      paymentId: payment._id,
      provider: "Cashfree",
      gatewayOrderId: payment.cfOrderId,
      order: null, // will attach once payment succeeds
      amount,
      currency: "INR",
      status: "pending",
      userId,
      providerId,
      serviceId,
      rawResponse: cfOrder,
    });
    console.log("Transaction created:", txn._id);

    return res.status(200).json({
      success: true,
      paymentId: payment._id,
      transactionId: txn._id,
      gatewayOrderId: payment.cfOrderId,
      paymentSessionId: cfOrder?.payment_session_id,
      redirectInfo: {
        cashfreeHostedExample: `${CF_BASE}/checkout/post/submit`,
      },
    });
  } catch (err) {
    console.error("Error in initiatePayment:", err);
    next(err);
  }
};


/**
 * 2) VERIFY after redirect (front-end calls this on success page)
 */
export const  verifyPaymentAndCreateOrder = async (req, res, next) => {
  try {
    const { order_id: gatewayOrderId, paymentId } = req.query;
    console.log("verifyPaymentAndCreateOrder query params:", { gatewayOrderId, paymentId });
    if (!gatewayOrderId) {
      console.log("Missing order_id in query, returning 400");
      return res.status(400).json({ message: "Missing order_id" });
    }

    const { data: cfOrder } = await cf.get(`/orders/${gatewayOrderId}`);
    console.log("Fetched Cashfree order:", cfOrder);

    const txn = await Transaction.findOneAndUpdate(
      { gatewayOrderId },
      {
        rawResponse: cfOrder,
        status:
          cfOrder?.order_status === "PAID"
            ? "success"
            : cfOrder?.order_status === "FAILED"
              ? "failed"
              : "pending",
      },
      { new: true }
    );
    console.log("Transaction updated:", txn?._id, txn?.status);

    const payment = await Payment.findById(txn?.paymentId || paymentId);
    console.log("Fetched payment document:", payment?._id);

    if (!payment) {
      console.log("Payment not found, returning 404");
      return res.status(404).json({ message: "Payment not found" });
    }

    if (cfOrder?.order_status === "PAID") {
      if (payment.orderId) {
        const existingOrder = await Order.findById(payment.orderId);
        console.log("Existing order found for payment:", existingOrder._id);
        return res.status(200).json({ success: true, paid: true, order: existingOrder });
      }
      console.log("No existing order, creating new one");

      const newOrder = await Order.create({
        user: payment.userId,
        providerId: payment.providerId,
        serviceId: payment.serviceId,
        address: payment.address,
        pincode: payment.pincode,
        city: payment.city,
        district: payment.district,
        stateName: payment.stateName,
        country: payment.country,
        appointmentSlot: payment.appointmentSlot,
        totalAmount: payment.amount,
        status: "received",
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        customerPhone: payment.customerPhone,
      });
      console.log("New order created:", newOrder._id);

      payment.status = "success";
      payment.orderId = newOrder._id;
      await payment.save();
      console.log("Payment updated with orderId and status");

      return res.status(201).json({ success: true, paid: true, order: newOrder });
    }

    console.log("Payment not successful, status:", cfOrder?.order_status);
    return res.status(200).json({
      success: true,
      paid: false,
      cashfreeStatus: cfOrder?.order_status,
    });
  } catch (err) {
    console.error("Error in verifyPaymentAndCreateOrder:", err);
    next(err);
  }
};


/**
 * 3) WEBHOOK (Cashfree → Server)
 */
export const cashfreeWebhook = async (req, res, next) => {
  try {
    const timestamp = req.header("x-webhook-timestamp");
    const signature = req.header("x-webhook-signature");

    console.log("🔔 Webhook received");
    console.log("Headers:", {
      timestamp,
      signature,
      all: req.headers,
    });
if (!signature && !timestamp) {
  console.log("⚠️ Test ping from dashboard (no signature/timestamp)");
  return res.status(200).send("ok");
}

// Ensure rawBody is a string
const payload = typeof req.rawBody === "string" ? req.rawBody : "";
console.log("Raw payload:", payload);

const signedPayload = `${timestamp}${payload}`;
console.log("Signed payload:", signedPayload);

    const expected = crypto
      .createHmac("sha256", process.env.CASHFREE_SECRET)
      .update(signedPayload)
      .digest("base64");

    console.log("Expected signature:", expected);

    if (expected !== signature) {
      console.error("❌ Signature mismatch!");
      return res.status(400).send("Invalid signature");
    }

    console.log("✅ Signature verified successfully");

    const event = JSON.parse(payload);
    console.log("Parsed event:", JSON.stringify(event, null, 2));

    const gatewayOrderId =
      event?.data?.order?.order_id || event?.data?.payment?.order_id;

    console.log("Gateway Order ID:", gatewayOrderId);

    if (!gatewayOrderId) {
      console.log("⚠️ No gatewayOrderId found in event");
      return res.status(200).send("ok");
    }

    const { data: cfOrder } = await cf.get(`/orders/${gatewayOrderId}`);
    console.log("Cashfree order fetched:", cfOrder);

    const txn = await Transaction.findOneAndUpdate(
      { gatewayOrderId },
      {
        rawResponse: cfOrder,
        status:
          cfOrder?.order_status === "PAID"
            ? "success"
            : cfOrder?.order_status === "FAILED"
              ? "failed"
              : "pending",
      },
      { new: true }
    );

    console.log("Transaction updated:", txn?._id, txn?.status);

    if (!txn) {
      console.log("⚠️ No matching transaction found");
      return res.status(200).send("ok");
    }

    const payment = await Payment.findById(txn.paymentId);
    console.log("Linked payment:", payment?._id, payment?.status);

    if (!payment) {
      console.log("⚠️ No payment found for transaction");
      return res.status(200).send("ok");
    }

    if (cfOrder?.order_status === "PAID" && !payment.orderId) {
  console.log("💰 Payment succeeded, creating order");

  const { customer_details } = event.data || {};

  const newOrder = await Order.create({
    user: payment.userId,
    providerId: payment.providerId,
    serviceId: payment.serviceId,
    address: payment.address,
    pincode: payment.pincode || "000000", // fallback if missing
    city: payment.city,
    district: payment.district,
    stateName: payment.stateName,
    country: payment.country,
    appointmentSlot: payment.appointmentSlot,
    totalAmount: payment.amount,
    status: "received",
    customerName: customer_details?.customer_name || payment.customerName || "NA",
    customerEmail: customer_details?.customer_email || payment.customerEmail || "na@example.com",
    customerPhone: customer_details?.customer_phone || payment.customerPhone || "9999999999",
  });

  console.log("Order created via webhook:", newOrder._id);

  payment.status = "success";
  payment.orderId = newOrder._id;
  await payment.save();

  console.log("Payment updated with new orderId and status");
}

     

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    next(err);
  }
};
