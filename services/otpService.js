import bcrypt from "bcrypt";
import crypto from "crypto";
import { Otp } from "../models/otp.model.js"; // Adjust the path as necessary
import nodemailer from "nodemailer";

export const generateOtp = async (userId, email, purpose) => {
  const otp = crypto.randomInt(100000, 999999).toString();
  console.log(`Generated OTP for ${purpose}: ${otp}`);
  
  const otpHash = await bcrypt.hash(otp, 10);

  await Otp.deleteMany({ email, purpose, used: false }); // Clean old OTPs

  await Otp.create({
    userId,
    email,
    otpHash,
    purpose
  });

  await sendOtpEmail(email, otp, purpose);
// Only for testing/logging, don't send in prod logs
};

const sendOtpEmail = async (email, otp, purpose) => {
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


  const subjectMap = {
    register: "Complete your registration - OTP Verification",
    login: "Login OTP Verification",
    reset: "Password Reset OTP",
    "2fa": "Two-Factor Authentication Code"
  };

  await transporter.sendMail({
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subjectMap[purpose] || "Your OTP Code",
    html: `
      <h2>Your OTP Code</h2>
      <p>Use the following OTP to complete your ${purpose}:</p>
      <h1>${otp}</h1>
      <p>This code will expire in 5 minutes. Do not share it with anyone.</p>
    `
  });
};

export const verifyOtp = async (email, purpose, otpInput) => {
  const otpRecord = await Otp.findOne({ email, purpose, used: false });
console.log(otpRecord,purpose,email);

  if (!otpRecord) throw new Error("OTP not found or already used");
  if (otpRecord.expiresAt < new Date()) throw new Error("OTP expired");
  if (otpRecord.attempts >= 3) throw new Error("Max attempts reached");

  otpRecord.attempts += 1;

  const isMatch = await otpRecord.compareOtp(otpInput);

  if (!isMatch) {
    await otpRecord.save();
    throw new Error("Invalid OTP");
  }

  otpRecord.used = true;
  await otpRecord.save();

  return true;
};
