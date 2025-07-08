import express from "express";
import { generateTiming } from "../services/timing.js";

const router = express.Router();

/**
 * POST /api/timing
 * body: {
 *   topic:          string,
 *   questionCount:  number,
 *   answerDuration: number   // sekundy (na froncie tymczasowo settings.answerDuration)
 * }
 * 
 * zwraca: { intro, cta, ctaAfter, cutins[], outro }
 * 
 * TODO: poprawić hooka na intrze
 */
router.post("/", async (req, res) => {
  console.log("🛬  /api/timing  body:", req.body);          // <- LOG

  const { topic, questionCount, answerDuration } = req.body;

  const missing =
    !topic?.trim() ||
    typeof questionCount  !== "number" ||
    typeof answerDuration !== "number";

  if (missing) {
    console.warn("⚠️  /timing 400 – bad payload");
    return res.status(400).json({ error: "Missing or invalid topic / questionCount / answerDuration" });
  }

  try {
    const result = await generateTiming(topic, questionCount, answerDuration);
    res.json(result);
  } catch (err) {
    console.error("❌ Timing generation error:", err);
    res.status(500).json({ error: "Failed to generate timing" });
  }
});


export default router;
