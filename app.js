import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import logger from "./utils/logger.js";

import errorHandler from "./middlewares/ErrorHandler.middleware.js";

// Routers
import { userRouter } from "./routes/user.routes.js";
import { orderRouter } from "./routes/order.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { servicesRouter } from "./routes/service.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { serviceProviderRouter } from "./routes/serviceProvider.routes.js";
import suggestionRoutes from "./routes/suggestion.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";

// Webhook
import { cashfreeWebhook } from "./controllers/payment.controller.js";
import { rawBodyMiddleware } from "./middlewares/rawBody.middleware.js";

const app = express();
const morganFormat = ":method :url :status :response-time ms";

// ------------------- MIDDLEWARES -------------------

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      process.env.PROVIDER_URL,
      process.env.FRONTEND_URL,
      "https://frontend-six-ashen-58.vercel.app",
    ],
    credentials: true,
  })
);

// Logger
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const [method, url, status, responseTime] = message.trim().split(" ");
        logger.info(JSON.stringify({ method, url, status, responseTime }));
      },
    },
  })
);

// ------------------- BODY PARSERS -------------------

// Webhook must be raw
app.post("/api/payments/webhook", rawBodyMiddleware, cashfreeWebhook);

// Global JSON & URL-encoded parsers for all other routes
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Cookies & static
app.use(cookieParser());
app.use(express.static("public"));

// ------------------- ROUTES -------------------

// Health check
app.get("/", (req, res) => {
  res.send("🚀 Server is live and running!");
});

// Payment routes (except webhook)
app.use("/api/payments", paymentRouter);

// Other API routes
app.use("/api/user", userRouter);
app.use("/api/orders", orderRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/services", servicesRouter);
app.use("/api/review", reviewRouter);
app.use("/api/provider", serviceProviderRouter);
app.use("/api/suggestions", suggestionRoutes);

// Error handler (last)
app.use(errorHandler);

export { app };
