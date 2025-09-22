import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
 
 
const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: String,
    profileImg: String,
    refreshToken: String,

    isVerified: {
      type: Boolean,
      default: false,
    },
   
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order",
      },
    ]
  },
  {
    timestamps: true
  }
);
 
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
 
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};
 
userSchema.methods.createAccessToken = function () {
  return jwt.sign(
    { id: this._id, userName: this.userName, email: this.email,isVerified: this.isVerified, },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};
 
userSchema.methods.createRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" }
  );
};
 
export const User = mongoose.model("User", userSchema);