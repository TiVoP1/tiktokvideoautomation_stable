// Mikroserwis najbardziej stabilne remotnion bylo z dynamicznym json pod localhost:4000/json

import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4000;
const app = express();
app.use(cors());
app.use(express.json());

const LAST_JSON_PATH = path.join(tmpdir(), "remotion-last.json");

let renderQueue = [];
let isRendering = false;

const enqueueRender = (task) => {
  renderQueue.push(task);
  processQueue();
};

const processQueue = async () => {
  if (isRendering || renderQueue.length === 0) return;

  isRendering = true;
  const task = renderQueue.shift();

  try {
    await task();
  } catch (err) {
    console.error("❌ Render task failed:", err);
  } finally {
    isRendering = false;
    processQueue();
  }
};

app.get("/", (_req, res) => {
  res.send("✅ Remotion API is running.");
});

app.get("/json", async (_req, res) => {
  try {
    const file = await fs.readFile(LAST_JSON_PATH, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.send(file);
  } catch {
    res.status(404).send("❌ No JSON loaded yet");
  }
});

app.post("/api/render", async (req, res) => {
  const { jsonUrl } = req.body;

  if (!jsonUrl || typeof jsonUrl !== "string") {
    return res.status(400).send("❌ Missing or invalid jsonUrl");
  }

  const jobId = randomUUID();
  const outPath = path.join(tmpdir(), `${jobId}.mp4`);

  console.log("🎬 Queuing render for:", jsonUrl);

  enqueueRender(async () => {
    let sent = false;

    try {
      console.log("🌐 Downloading JSON...");
      const response = await fetch(jsonUrl);
      if (!response.ok) throw new Error("❌ Failed to fetch JSON");
      const json = await response.json();
      await fs.writeFile(LAST_JSON_PATH, JSON.stringify(json, null, 2));

      console.log("🎞️ Launching Remotion render...");

      await new Promise((resolve, reject) => {
    const proc = spawn(
  "npx",
  [
    "remotion",
    "render",
    "Main",
    outPath,
    "--codec=h264",
    "--crf=16",
    "--x264-preset=slow",
    "--concurrency=3",
    "--timeout=180000"
  ],
  { cwd: __dirname, shell: true }
);


        proc.stdout.on("data", (data) => process.stdout.write(data));
        proc.stderr.on("data", (data) => process.stderr.write(data));

        proc.on("close", (code) => {
          code === 0 ? resolve(null) : reject(new Error(`Render exited with code ${code}`));
        });
      });

      console.log("📤 Reading output file...");
      const buffer = await fs.readFile(outPath);

      res.setHeader("Content-Type", "video/mp4");
      res.send(buffer);
      sent = true;

      await fs.unlink(outPath);
      console.log("🧹 Cleaned up temp file:", outPath);
    } catch (err) {
      console.error("❌ Render error:", err);
      if (!sent && !res.headersSent) {
        res.status(500).send("Render failed");
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Remotion server running at http://localhost:${PORT}`);
});
