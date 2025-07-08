import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.ELEVENLABS_API;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Adam
const AUDIO_DIR = path.resolve("public/audio");
const BASE_URL = process.env.PUBLIC_AUDIO_URL || "http://localhost:3001/audio";

export async function generateTTS(text) {
  const id = randomUUID();
  const filename = `${id}.mp3`;
  const filePath = path.join(AUDIO_DIR, filename);

  await fs.mkdir(AUDIO_DIR, { recursive: true });

  try {
    const payload = {
      model_id: "eleven_multilingual_v2",
      text
      // ❌ voice_settings usunięte bo Adam nie wspiera
    };

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      payload,
      {
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    await fs.writeFile(filePath, response.data);

    return {
      url: `${BASE_URL}/${filename}`,
      filePath
    };
  } catch (err) {
    console.error("❌ TTS failed:", err.response?.data || err.message);
    throw new Error("TTS failed: " + (err.response?.data?.detail || err.message));
  }
}

export function getOrdinalText(index, total) {
  if (total === 1) return "last one";
  if (index === 0) return "first one";
  if (index === total - 1) return "last one";
  

  //TODO Ordinals na optymalizacje trzeba przeroibć na lokalne pliki mp3 na host zaoszczędzi 1/4 tokenów elevenlabs
  const ORDINALS = [
    "second one", "third one", "fourth one", "fifth one",
    "sixth one", "seventh one", "eighth one", "ninth one", "tenth one",
    "eleventh one", "twelfth one", "thirteenth one", "fourteenth one", "fifteenth one",
    "sixteenth one", "seventeenth one", "eighteenth one", "nineteenth one", "twentieth one"
  ];

  return ORDINALS[index - 1] || `${index + 1}th one`;
}
