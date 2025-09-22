import express from "express";
import { getLatestSuggestions } from "../controllers/suggestion.controller.js";

const router = express.Router();

// GET /api/suggestions/latest
router.get("/latest", getLatestSuggestions);

export default router;
