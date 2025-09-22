import { Review } from "../models/review.model.js";
import { asyncHandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

let reviewsCache = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hr

export const getAllReviews = asyncHandler(async (req, res) => {
  const now = Date.now();

  if (reviewsCache.data && now - reviewsCache.timestamp < CACHE_DURATION) {
    return res
      .status(200)
      .json(new ApiResponse(200, reviewsCache.data, "Reviews fetched from cache"));
  }

  // Populate user name and service title
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate({ path: "userId", select: "userName" })          // populate user name only
    .populate({ path: "serviceId", select: "title" })      // populate service title only
    .exec();

  reviewsCache.data = reviews;
  reviewsCache.timestamp = now;

  return res
    .status(200)
    .json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
});
