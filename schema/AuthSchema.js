import { z } from "zod";

export const otpSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid Email"),
  otp: z.string().min(4, "OTP is required").max(8, "OTP is too long"),
});


const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,}$/

const passwordMessage =
  "Password must contain at least one Letter  and one number";

export const passwordResetSchema = z.object({
  identifier: z.string()
    .refine(
      (val) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^[6-9]\d{9}$/.test(val),
      {
        message: "Must be a valid email or phone number",
      }
    ),
  otp: z.string().min(4, "OTP is required").max(8, "OTP is too long"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, passwordMessage),
});

export const emailOnlySchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid Email"),
});

export const resetPasswordSchema = z.object({
  identifier: z.string()
    .refine(
      (val) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^[6-9]\d{9}$/.test(val),
      {
        message: "Must be a valid email or phone number",
      }
    ),
});

export const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid Email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, passwordMessage),
  userName: z
    .string()
    .min(1, "Name is required")
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name is too long"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long"),
});


const providerCodeRegex = /^[A-Z]{2}-[A-Z]{3}-\d{2}-[A-Z]{2}-\d{2}$/;

const emailSchema = z.string().email("Invalid Email");
const providerCodeSchema = z.string().regex(providerCodeRegex, "Invalid Provider Code");
export const signinSchema = z.object({
  identifier: z.string()
    .refine(
      (val) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^[6-9]\d{9}$/.test(val),
      {
        message: "Must be a valid email or phone number",
      }
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, passwordMessage),
});
export const siginSchemaProvider = z.object({
  identifier: z.union([emailSchema, providerCodeSchema]),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, passwordMessage),
})