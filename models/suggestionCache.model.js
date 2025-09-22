import mongoose from "mongoose";

const suggestionCacheSchema = new mongoose.Schema({
  key: { type: String, default: "global" },
  suggestions: [{ type: String }],
  createdAt: { type: Date, default: Date.now }, // remove index: true
});


export const SuggestionCache = mongoose.model("SuggestionCache", suggestionCacheSchema);
