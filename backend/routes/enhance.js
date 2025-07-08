import express from "express";
import { enhanceQuestion } from "../services/enhancer.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { topic, correctAnswer } = req.body;

  if (!topic || !correctAnswer) {
    return res.status(400).json({ error: "Missing topic or correctAnswer" });
  }

  try {
    const enhanced = await enhanceQuestion(topic, correctAnswer);
    res.json(enhanced);
  } catch (err) {
    console.error("❌ Enhance error:", err);
    res.status(500).json({ error: "Failed to enhance question" });
  }
});

export default router;
