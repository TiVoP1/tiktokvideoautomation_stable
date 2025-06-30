import fetch from "node-fetch";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

const RENDER_API = "http://localhost:4000/api/render";

export async function renderFromJson(jsonFilename) {
  const id = randomUUID();
  const outputFilename = `${id}.mp4`;
  const outputPath = path.resolve("rendered", outputFilename);

  const res = await fetch(RENDER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonUrl: `http://localhost:3001/generated/${jsonFilename}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`❌ Render failed: ${res.status} ${await res.text()}`);
  }

  const buffer = await res.arrayBuffer();
  await fs.mkdir("rendered", { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(buffer));

  return outputPath;
}
