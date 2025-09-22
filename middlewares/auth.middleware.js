import { asyncHandler } from "../utils/Asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";



const jwtVerify = asyncHandler(
  async (req, res, next) => {
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        throw new ApiError(
          401,
          "Unauthorized: No authorization header provided"
        );
      }


      // Check if token starts with "Bearer "
      if (!authHeader.startsWith("Bearer ")) {
        throw new ApiError(401, "Unauthorized: Invalid authorization format");
      }

      const token = authHeader.split("Bearer ")[1];

      if (!token) {
        throw new ApiError(401, "Unauthorized: No token provided");
      }

      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );
      
      const user = {
        email: decoded.email,
        id: decoded.id,
        userName: decoded.userName,
        isVerified: decoded.isVerified,
      };
    
      
      req.user = user;
      next();

    }
);

export { jwtVerify };