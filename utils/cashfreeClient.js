import axios from "axios";

const isSandbox = (process.env.CASHFREE_ENV || "sandbox") !== "production";
export const CF_BASE = isSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";

if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET) {
  console.warn("⚠️ CASHFREE_APP_ID or CASHFREE_SECRET is not set. Check your .env for sandbox/production keys.");
}

export const cf = axios.create({
  baseURL: CF_BASE,
  headers: {
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET,
    "x-api-version": "2023-08-01",
    "Content-Type": "application/json",
  },
  timeout: 15000,
});
