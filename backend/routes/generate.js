import express from "express";
import { generateVideo } from "../services/generator.js";
import { progressMap } from "../services/state.js";
import { randomUUID } from "crypto";

const router = express.Router();

/**
 * POST /api/generate
 * Rozpoczyna generowanie filmu. Zwraca jobId. potrzebne do /progress
 */
router.post("/", async (req, res) => {
  const jobId = randomUUID();
  const startedAt = Date.now();

  progressMap.set(jobId, {
    status: "starting",
    progress: 0,
    message: "Starting generation…",
    startedAt
  });

  generateVideo(req.body, (step, msg) => {
    const prev = progressMap.get(jobId) || { progress: 0 };
    const safeStep = Math.max(prev.progress, step); // zapobiega spadkom

    progressMap.set(jobId, {
      ...prev,
      status: "generating",
      progress: safeStep,
      message: msg,
      startedAt
    });
  })
    .then(result => {
      progressMap.set(jobId, {
        status: "completed",
        progress: 100,
        message: result.message,
        videoUrl: result.videoUrl,
        startedAt
      });
    })
    .catch(err => {
      console.error("❌ Generation error:", err);
      progressMap.set(jobId, {
        status: "error",
        progress: 0,
        message: err.message || "Generation failed",
        startedAt
      });
    });


  res.json({ jobId });
});

/**
 * POST /api/progress
 * Body: { jobId } zwraca progress jobId
 */
router.post("/progress", (req, res) => {
  const { jobId } = req.body;
  if (!jobId || !progressMap.has(jobId)) {
    return res.status(404).json({ status: "error", progress: 0, message: "Invalid or unknown jobId" });
  }

  const status = progressMap.get(jobId);
  res.json(status);
});

export default router;
