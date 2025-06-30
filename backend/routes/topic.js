import express from "express";
import { generateQuizTopic } from "../services/quizGenerator.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const topic = await generateQuizTopic();
    res.json({ topic });
  } catch (error) {
    console.error("❌ Error generating topic:", error);
    res.status(500).json({ error: "Failed to generate topic" });
  }
});

export default router;  
