import mongoose, { Schema } from "mongoose";
 
const serviceSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: ["Business", "Identity Document","RTO Related","Company Services"],
            required: true,
        },
        requiredDocuments: [{
            type: String,
            enum: [
                "Aadhar Card",
                "PAN Card",
                "Passport",
                "Driving License",
                "Voter ID",
                "Birth Certificate",
                "Marriage Certificate",
                "Income Certificate",
                "Photo",
                
            ],
        }],
        awarenessPdf: String, // Just store the PDF URL
    },
    {
        timestamps: true
    }
);

export const Service = mongoose.model("Service", serviceSchema);