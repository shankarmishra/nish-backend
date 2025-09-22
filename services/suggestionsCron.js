import cron from "node-cron";
import { rebuildSuggestionCache } from "../services/suggestionsService.js";

/**
 * Run on server startup immediately
 */
(async () => {
  try {
    console.log("[INIT] Rebuilding suggestions at", new Date().toISOString());
    await rebuildSuggestionCache();
    console.log("[INIT] Rebuild finished at", new Date().toISOString());
  } catch (err) {
    console.error("[INIT] Error rebuilding suggestions:", err);
  }
})();
/**
 * Schedule: every day at 00:10 server time.
 * You can change the cron pattern to suit server timezone.
 */
cron.schedule("10 0 * * *", async () => {
  try {
    console.log("[CRON] Rebuilding suggestions at", new Date().toISOString());
    await rebuildSuggestionCache();
    console.log("[CRON] Rebuild finished at", new Date().toISOString());
  } catch (err) {
    console.error("[CRON] Error rebuilding suggestions:", err);
  }
});
