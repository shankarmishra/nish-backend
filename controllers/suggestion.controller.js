import { SuggestionCache } from "../models/suggestionCache.model.js";

// Controller to fetch latest suggestions
export const getLatestSuggestions = async (req, res) => {
  try {
    const cache = await SuggestionCache.findOne({ key: "global" }).lean();
    const suggestions = cache?.suggestions || [];

    return res.json({ suggestions: suggestions.slice(0, 5000) });
  } catch (err) {
    console.error("Error fetching suggestions:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
