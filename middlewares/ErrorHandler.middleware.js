 
import { ZodError } from "zod";
 
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof ZodError) {
    const issues = err.errors.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: issues,
    });
  }
 
  // Domain or generic errors
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
 
export default errorHandler;