import { ServiceProvider } from "../models/serviceProvider.model.js";
import { asyncHandler } from "../utils/Asynchandler.js";
import { generateOtp, verifyOtp } from "../services/otpService.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { otpSchema, passwordResetSchema, siginSchemaProvider, signinSchema } from "../schema/AuthSchema.js";

const refreshTokenOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Generate Access + Refresh Tokens
const generateAccessAndRefreshToken = async (providerId) => {
  const provider = await ServiceProvider.findById(providerId);
  if (!provider) throw new ApiError(404, "Service Provider not found");

  const accessToken = provider.createAccessToken();
  const refreshToken = provider.createRefreshToken();

  provider.refreshToken = refreshToken;
  await provider.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// 🔹 Login Provider
export const LoginProvider = asyncHandler(async (req, res) => {


  console.log(req.body);
  const validatedData = siginSchemaProvider.parse(req.body);
  
  const { identifier, password } = validatedData;

  const provider = await ServiceProvider.findOne({
    $or: [{ email: identifier }, { providerCode: identifier }]
  });
  if (!provider) throw new ApiError(400, "Invalid credentials");

  const isMatch = await provider.comparePassword(password);
  if (!isMatch) throw new ApiError(400, "Invalid credentials");

  await generateOtp(provider?._id, provider?.email, "login");

  return res.status(200).json(
    new ApiResponse(200, { email: provider.email }, "OTP sent to your email")
  );
})

export const VerifyProvider = asyncHandler(async (req, res) => {
  const { email, otp } = otpSchema.parse(req.body);
console.log(req.body);

  const provider = await ServiceProvider.findOne({ email });
  if (!provider) throw new ApiError(400, "Invalid credentials");
  await verifyOtp(email, "login", otp);

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(provider._id);
  return res
    .status(200)
    .cookie("providerRefreshToken", refreshToken, refreshTokenOptions)
    .json(new ApiResponse(200,
      {
        provider: {
          id: provider._id,
          name: provider.name,
          email: provider.email,
        },
        accessToken
      },
      "Provider logged in successfully"
    ));
});

// 🔹 Logout Provider
export const logoutProvider = asyncHandler(async (req, res) => {

  const refreshToken = req.cookies?.providerRefreshToken;
  if (!refreshToken) {
    console.warn("⚠️ No refresh token cookie found on logout");
  } else {
    console.log("Received refresh token cookie:", refreshToken);
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      console.log("Decoded refresh token:", decoded);

      const updateResult = await ServiceProvider.findByIdAndUpdate(
        decoded?.id,
        { $unset: { refreshToken: 1 } },
        { new: true }
      );

      7
    } catch (err) {
      console.error("❌ Refresh token verification failed on logout:", err.message);
    }
  }

  res.clearCookie("providerRefreshToken", {
    httpOnly: true,
    secure: true,        // ⚠️ in localhost, may block deletion
    sameSite: "none",    // ⚠️ in localhost, may block deletion
    path: "/",           // must match login path
  });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Provider signed out successfully"));
});



// 🔹 Refresh Token
export const refreshProviderAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.providerRefreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const provider = await ServiceProvider.findById(decoded?.id);

  if (!provider || provider.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(provider._id);

  return res
    .status(200)
    .cookie("providerRefreshToken", newRefreshToken, refreshTokenOptions)
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed successfully"));
});

// 🔹 Get Provider Profile
export const getProviderProfile = asyncHandler(async (req, res) => {
  if (!req.provider) throw new ApiError(401, "Unauthorized");

  // Populate nested service reference within provider.services[]
  const provider = await ServiceProvider.findById(req.provider.id)
    .select("name email services iconUrl imageUrl location gstin providerCode")
    .populate({
      path: "services.serviceId",
      select: "title description category awarenessPdf",
    })
    .lean();

  if (!provider) throw new ApiError(404, "Provider not found");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        iconUrl: provider.iconUrl || provider.imageUrl || null,
        location: provider.location || {},
        gstin: provider.gstin || null,
        providerCode: provider.providerCode || "",
        services: provider.services || [],
      },
      "Provider profile fetched successfully"
    )
  );
});


// 🔹 Verify OTP + Reset password
export const resetProviderPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = passwordResetSchema.parse(req.body);

  const provider = await ServiceProvider.findOne({ email });
  if (!provider) throw new ApiError(404, "Provider not found");

  await verifyOtp(email, "reset", otp);

  provider.password = newPassword; // hashed via pre-save hook
  await provider.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Password has been reset successfully")
  );
});
