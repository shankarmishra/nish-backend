import express from "express";
import {

  logoutProvider,
  refreshProviderAccessToken,
  getProviderProfile,
  VerifyProvider,
  LoginProvider
} from "../controllers/serviceProvider.controller.js";
import { jwtVerify } from "../middlewares/providerAuth.middleware.js";

const router = express.Router();

router.post("/login", LoginProvider);
router.post("/verify-otp",VerifyProvider)
router.post("/logout",  logoutProvider);
router.post("/refresh-token", refreshProviderAccessToken);
router.get("/me", jwtVerify, getProviderProfile);



export { router as serviceProviderRouter };
