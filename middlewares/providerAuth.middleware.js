import { asyncHandler } from "../utils/Asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const jwtVerify = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Unauthorized: Missing or invalid token");
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  if (decoded.type !== "serviceProvider") {
    throw new ApiError(403, "Forbidden: Not a service provider token");
  }

  req.provider = {
    id: decoded.id,
    name: decoded.name,
    email: decoded.email
  };

  next();
});
// in futerre if we have to query provider from db then
/* eg: 
const provider = await Provider.findById(decoded.id);
if (!provider) throw new ApiError(401, "Unauthorized: Provider not found");
req.user = provider;*/
