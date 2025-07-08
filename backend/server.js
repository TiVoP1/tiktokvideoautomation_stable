import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import topicRoute     from "./routes/topic.js";
import questionsRoute from "./routes/questions.js";
import timingRoute    from "./routes/timing.js";
import enhanceRoute   from "./routes/enhance.js";
import generateRoute  from "./routes/generate.js";
import uploadRoute    from "./routes/upload.js";
import filesRoute     from "./services/files.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "512mb" }));
app.use(express.urlencoded({ extended: true, limit: "512mb" }));

app.use("/public", express.static(path.resolve("public")));
app.use("/audio", express.static("public/audio"));
app.use("/video", express.static(path.join(process.cwd(), "rendered")));

// Serwowanie plików z `filestohost/`
app.use("/assets", filesRoute);
app.get("/", (req, res) => {
  res.send("Backend działa! 🔥");
});

// API endpoints
app.use("/api/upload",   uploadRoute);
app.use("/api/topic",    topicRoute);
app.use("/api/questions",questionsRoute);
app.use("/api/enhance",  enhanceRoute);
app.use("/api/timing",   timingRoute);
app.use("/api/generate", generateRoute);
app.use("/images", express.static("public/images"));
app.use("/generated", express.static(path.resolve("generated-json")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
