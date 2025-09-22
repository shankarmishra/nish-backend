// routes/reviewRoutes.js
import express from "express";
import {
 getAllReviews
} from "../controllers/review.controller.js";

const router = express.Router();

// Create a review
router.get("/",  getAllReviews);

export  {router as reviewRouter};
