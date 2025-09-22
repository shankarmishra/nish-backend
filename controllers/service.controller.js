import { ServiceProvider } from "../models/serviceProvider.model.js";
import { Service } from "../models/service.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Get all unique services with provider details
export const ServicesFetching = asyncHandler(async (req, res) => {
  const {
    search = "",
    category = "all",
    minPrice = 0,
    maxPrice = 1000000,
    page = 1,
    limit = 10,
    sort = "priceAsc",
  } = req.query;

  // Build a match condition for aggregation pipeline
  const matchConditions = [];

  // We'll match price range on provider services.price
  matchConditions.push({
    "services.price": { $gte: Number(minPrice), $lte: Number(maxPrice) },
  });

  // Category filter - on serviceDetails.category
  if (category !== "all") {
    matchConditions.push({
      "serviceDetails.category": category,
    });
  }

  // Text search on title or description - case insensitive regex on title & description
  if (search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    matchConditions.push({
      $or: [
        { "serviceDetails.title": regex },
        { "services.description": regex },
        { "name":regex},
      ],
    });
  }

  // Compose the pipeline
  const pipeline = [
    { $unwind: "$services" },
    {
      $lookup: {
        from: "services",
        localField: "services.serviceId",
        foreignField: "_id",
        as: "serviceDetails",
      },
    },
    { $unwind: "$serviceDetails" },
    // Match after lookup to filter data
    ...(matchConditions.length ? [{ $match: { $and: matchConditions } }] : []),
    {
      $project: {
        _id: 0,
        serviceId: "$serviceDetails._id",
        title: "$serviceDetails.title",
        category: "$serviceDetails.category",
        description: "$services.description",
        estimatedTime: "$services.estimatedTime",
        price: "$services.price",
        requiredDocuments: "$serviceDetails.requiredDocuments",
        providerId: "$_id",
        providerName: "$name",
        image: "$serviceDetails.awarenessPdf",
      },
    },
  ];

  // Sorting
  const sortStage = {};
  if (sort === "priceAsc") sortStage.price = 1;
  else if (sort === "priceDesc") sortStage.price = -1;

  if (Object.keys(sortStage).length) {
    pipeline.push({ $sort: sortStage });
  }
  
  const skip = (Number(page) - 1) * Number(limit);
  
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: Number(limit) });

  // Run aggregation
  const services = await ServiceProvider.aggregate(pipeline);

  // Get total count for pagination (without skip/limit)
  // For count, run same pipeline but stop before skip and limit
  const countPipeline = pipeline.filter(stage => {
    // exclude skip and limit stages for counting
    return !("$skip" in stage || "$limit" in stage || "$sort" in stage);
  });

  // Also remove sort from count pipeline for performance
  const totalCountArr = await ServiceProvider.aggregate(countPipeline);
  const totalCount = totalCountArr.length;

  return res.status(200).json(new ApiResponse(200, {
    services,
    totalCount,
    page: Number(page),
    totalPages: Math.ceil(totalCount / limit),
  }, "Services fetched"));
});