import { Router } from "express";
import {
  registerUser,
  verifyUserOtp, // ✅ new
  loginUser,
  logoutUser,
  getMe,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  requestOtpLogin,
  loginOtp,
  resendRegisterOtp,
} from "../controllers/user.controller.js";
import { jwtVerify } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/verify-otp", verifyUserOtp); // ✅ OTP verification
router.post("/resend-verify-otp", resendRegisterOtp); // ✅ resend verification OTP
router.post("/login", loginUser);
router.post("/request-login-otp", requestOtpLogin);
router.post("/login-otp", loginOtp);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logoutUser);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
// User data
router.get("/me", jwtVerify, getMe);

export { router as userRouter };
