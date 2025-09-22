import { Service } from "../models/service.model.js";
import { ServiceProvider } from "../models/serviceProvider.model.js";
import { SuggestionCache } from "../models/suggestionCache.model.js";

/**
 * Simple stopwords set. Expand for other languages.
 */
const STOPWORDS = new Set([
  "a","an","and","the","is","in","on","of","for","to","with","by","from","at","or","as","that","this","it","be"
]);

function normalizeText(text) {
  return (text || "")
    .normalize("NFKD")
    .replace(/[\"'`.,/\\()\[\]{}:;!?<>=+*^%$#@~_-]/g, " ")

    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractWords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const tokens = normalized.split(" ");
  const uniq = new Set();
  for (const t of tokens) {
    if (!t) continue;
    if (t.length <= 2) continue;
    if (STOPWORDS.has(t)) continue;
    uniq.add(t);
  }
  return Array.from(uniq);
}

// Build suggestions using titles, categories, provider names (whole phrases)
// and unique words from descriptions/titles.
export async function buildSuggestionsFromDB(limitDocs = 10000) {
  const providers = await ServiceProvider.find({}, { name: 1 }).lean().limit(limitDocs);
  const services = await Service.find({}, { title: 1, description: 1, category: 1 }).lean().limit(limitDocs);

  const phrasesSet = new Set();

  // Full phrases
  for (const s of services) {
    if (s.title) phrasesSet.add(normalizeText(s.title));
    if (s.category) phrasesSet.add(normalizeText(s.category));
  }
  for (const p of providers) {
    if (p.name) phrasesSet.add(normalizeText(p.name));
  }

  // Unique words from descriptions/titles
  for (const s of services) {
    const words = extractWords(s.description || "").concat(extractWords(s.title || ""));
    for (const w of words) phrasesSet.add(w);
  }

  // Limit and return
  return Array.from(phrasesSet).slice(0, 20000);
}

export async function rebuildSuggestionCache() {
  const suggestions = await buildSuggestionsFromDB();
  await SuggestionCache.findOneAndUpdate(
    { key: "global" },
    { suggestions, createdAt: new Date() },
    { upsert: true }
  );
}
