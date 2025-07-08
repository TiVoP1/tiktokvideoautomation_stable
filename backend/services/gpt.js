// services/gpt.js
import { replicate } from "../config/replicate.js";

export async function runUntilSuccess(model, input) {
  let attempt = 0;
  while (true) {
    try {
      const result = await replicate.run(model, { input });
      const output = result?.output ?? result;
      if (Array.isArray(output)) return output.join("").trim();
      return typeof output === "string" ? output.trim() : output;
    } catch (err) {
      const isRateLimit = err?.message?.includes("429") || err?.response?.status === 429;
      const retryAfter = Number(err?.response?.body?.retry_after) || 8;

      if (isRateLimit) {
        const wait = (retryAfter + attempt * 2) * 1000;
        console.warn(`⏳ Rate limited (attempt ${attempt + 1}). Retrying in ${wait / 1000}s...`);
        await new Promise(res => setTimeout(res, wait));
        attempt++;
        continue;
      }

      console.error("❌ GPT call failed permanently:", err);
      throw err;
    }
  }
}
