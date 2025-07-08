import express from "express";
import { generateQuestionsFromTopic } from "../services/quizGenerator.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { topic, count } = req.body;

  try {
    const data = await generateQuestionsFromTopic(topic, count);
    res.json(data);
  } catch (error) {
    console.error("❌ Error generating questions:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

export default router;
