import { User } from "../models/user.model.js";
import {
  otpSchema,
  registerSchema,
  signinSchema,
  emailOnlySchema,
  passwordResetSchema,
  resetPasswordSchema,
} from "../schema/AuthSchema.js";
import { z } from "zod";
import { asyncHandler } from "../utils/Asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import { generateOtp, verifyOtp } from "../services/otpService.js";

const refreshTokenOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Generate tokens for a user
const genrerateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = await user.createAccessToken();
    const refreshToken = await user.createRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// Refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  console.log("Refreshing access token...");

  const incomingRefreshToken = req.cookies.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?.id);
  if (!user || incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const { accessToken, refreshToken: newRefreshToken } = await genrerateAccessAndRefreshToken(user._id);

  return res
    .status(200)
    .cookie("refreshToken", newRefreshToken, refreshTokenOptions)
    .json({ success: true, data: { accessToken } });
});



const registerUser = asyncHandler(async (req, res, next) => {

  const validatedData = registerSchema.parse(req.body);
  const { email, password, userName, phone } = validatedData;

  const existingUserByEmail = await User.findOne({ email });
  const existingUserByPhone = await User.findOne({ phone });

  if (existingUserByEmail) {
    return next(new ApiError(400, "User already exists with this email"));
  }

  if (existingUserByPhone) {
    return next(new ApiError(400, "User already exists with this phone number"));
  }

  const existingUser = existingUserByEmail || existingUserByPhone;
  if (existingUser) return next(new ApiError(400, "User already exists"));

  const user = await User.create({
    email,
    password,
    userName,
    phone,
    isVerified: false,
  });
 
  await generateOtp(user._id, email, "register");

  return res.status(201).json(
    new ApiResponse(
      201,
      { email },
      "User registered successfully. Please verify your email."
    )
  );


});


// Verify OTP and activate account
const verifyUserOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = otpSchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) return next(new ApiError(404, "User not found"));
  if (user.isVerified) return next(new ApiError(400, "User already verified"));

  await verifyOtp(email, "register", otp); // throws if invalid

  user.isVerified = true;
  await user.save();

  const { accessToken, refreshToken } = await genrerateAccessAndRefreshToken(
    user._id
  );
  console.log(`User ID: ${user._id} - Email verified successfully`);

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            id: user._id,
            email: user.email,
            userName: user.userName,
            isVerified: user.isVerified,
          },
          accessToken,
        },
        "Email verified successfully"
      )
    );
});

// Resend OTP for registration verification
const resendRegisterOtp = asyncHandler(async (req, res, next) => {
  const { email } = emailOnlySchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) return next(new ApiError(404, "User not found"));
  if (user.isVerified)
    return next(new ApiError(400, "User already verified"));

  await generateOtp(user._id, email, "register");

  return res
    .status(200)
    .json(new ApiResponse(200, { email }, "Verification OTP resent"));
});

// Login — block unverified users
const loginUser = asyncHandler(async (req, res, next) => {
  const validatedData = signinSchema.parse(req.body);
  const { identifier, password } = validatedData;

  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
  });
  if (!user) return next(new ApiError(400, "Invalid credentials"));

  const isMatchPassword = await user.comparePassword(password);
  if (!isMatchPassword) return next(new ApiError(400, "Invalid credentials"));


  const { accessToken, refreshToken } = await genrerateAccessAndRefreshToken(user.id);

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            id: user.id,
            userName: user.userName,
            email: user.email,
            isVerified: user.isVerified,
          },
          accessToken,
        },
        "User signed in successfully"
      )
    );

});

const requestOtpLogin = asyncHandler(async (req, res, next) => {
  const { email } = emailOnlySchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) return next(new ApiError(404, "User not found"));

  // generate OTP for reset
  await generateOtp(user._id, email, "login");

  return res.status(200).json(
    new ApiResponse(200, { email }, "OTP sent to your email")
  );
});

const loginOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = otpSchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) return next(new ApiError(404, "User not found"));


  // verify OTP for login (throws if invalid)
  await verifyOtp(email, "login", otp);

  const { accessToken, refreshToken } = await genrerateAccessAndRefreshToken(
    user._id
  );

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            id: user._id,
            email: user.email,
            userName: user.userName,
            isVerified: user.isVerified,
          },
          accessToken,
        },
        "User signed in successfully via OTP"
      )
    );
});
// Logout
const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user?.id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  const options = { httpOnly: true, sameSite: "none", secure: true };
  console.log("Clearing refresh token cookie");

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Signout successfully"));
});

// Get user data
const getMe = asyncHandler(async (req, res) => {
  await console.log(`Fetching user data for ID: ${req.user}`);

  if (!req.user) throw new ApiError(401, "Unauthorized");

  return res.status(200).json(new ApiResponse(200, {
    id: req.user.id,
    userName: req.user.userName,
    email: req.user.email,
    isVerified: req.user.isVerified
  }, "User data fetched"));
});

// Request password reset (send OTP to email)
const requestPasswordReset = asyncHandler(async (req, res, next) => {
  const { identifier } = resetPasswordSchema.parse(req.body);

  const user = await User.findOne(
    {$or:[{ email:identifier},{phone:identifier}] });
  if (!user) return next(new ApiError(404, "User not found"));

  // generate OTP for reset
  await generateOtp(user._id, user?.email, "reset");

  return res.status(200).json(
    new ApiResponse(200, { email:user?.email }, "Password reset OTP sent to your email")
  );
});

// Verify OTP + Reset password
const resetPassword = asyncHandler(async (req, res, next) => {

  console.log(req.body);
  const { identifier, otp, newPassword } = passwordResetSchema.parse(req.body);

  const user = await User.findOne({$or:[{ email:identifier},{phone:identifier}] });
  if (!user) return next(new ApiError(404, "User not found"));

  // verify otp (throws if invalid)
  await verifyOtp(user?.email, "reset", otp);

  user.password = newPassword; // pre-save hook will hash if implemented
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Password has been reset successfully")
  );
});

export {
  registerUser,
  verifyUserOtp,
  loginUser,
  logoutUser,
  getMe,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  requestOtpLogin,
  loginOtp,
  resendRegisterOtp,
};
