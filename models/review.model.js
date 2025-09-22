import mongoose, { Schema } from "mongoose";
 
const reviewSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        serviceProviderId: {
            type: Schema.Types.ObjectId,
            ref: "ServiceProvider",
            required: true,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: String,
    },
    {
        timestamps: true
    }
);
 
export const Review = mongoose.model("Review", reviewSchema);