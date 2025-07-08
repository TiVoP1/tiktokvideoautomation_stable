import fs from "fs";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.GPT_API });

export async function transcribeWithWhisper(filePath) {
  const fileStream = fs.createReadStream(filePath);

  const res = await openai.audio.transcriptions.create({
    file: fileStream,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"]
  });

  const words = res.words || [];
  return words.map((w) => ({
    text: w.word.trim(),
    start: +w.start.toFixed(2),
    end: +w.end.toFixed(2)
  }));
}
