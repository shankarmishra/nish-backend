

// Middleware for routes that need raw JSON body (Cashfree webhook)
// middlewares/rawBody.middleware.js
// Capture raw body as string for signature verification
export const rawBodyMiddleware = (req, res, next) => {
  let data = [];
  req.on("data", (chunk) => data.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(data).toString("utf-8");
    next();
  });
};
