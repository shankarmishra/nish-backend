import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const serviceProviderSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        phone: String,
        password: {
            type: String,
            required: true,
        },
        imageUrl: String,
        iconUrl: String, // small monochrome/brand icon for UI
        location: {
            state: { type: String },
            district: { type: String },
        },
        gstin: { type: String },
        providerCode: { type: String },
        services: [{
            serviceId: {
                type: Schema.Types.ObjectId,
                ref: "Service",
                required: true,
            },
            price: {
                type: Number,
                required: true,
            },
            description: String,
            reqDocs: String,
            estimatedTime: {
                type: String,
                default: "3 days",
            },
        }],
        refreshToken: String,
    },
    {
        timestamps: true
    }
);

// Expose virtuals in JSON/object (kept enabled for forward compatibility)
serviceProviderSchema.set("toJSON", { virtuals: true });
serviceProviderSchema.set("toObject", { virtuals: true });

// Hash password before saving
serviceProviderSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

serviceProviderSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

serviceProviderSchema.methods.createAccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            name: this.name,
            email: this.email,
            type: "serviceProvider"
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

serviceProviderSchema.methods.createRefreshToken = function () {
    return jwt.sign(
        { id: this._id, type: "serviceProvider" },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" }
    );
};

export const ServiceProvider = mongoose.model("ServiceProvider", serviceProviderSchema);