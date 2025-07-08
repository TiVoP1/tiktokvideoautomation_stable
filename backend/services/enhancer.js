import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import sharp from 'sharp';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ENV
 */
const openai = new OpenAI({ apiKey: process.env.GPT_API });
const DOG_KEY = process.env.SCRAPINGDOG_API_KEY;
const SHOTS_DIR = path.resolve('public/images');
const BASE_IMAGE_URL = process.env.PUBLIC_IMAGE_URL || 'https://videogenerator.pl/api/images';
const BLANK_MARK = `${BASE_IMAGE_URL}/blank.jpg`;

const FORBIDDEN = ['watermark','text','quote','gif','4k','funny','lobes','sinus'];

/**
 * HELPERY
 */
async function dl(url) {
  const r = await fetch(url, { headers: { Referer: 'https://www.google.com' } });
  if (!r.ok) throw new Error('DL fail');
  return Buffer.from(await r.arrayBuffer());
}

async function crop16x9(buf) {
  const base = await sharp(buf).resize({ height: 720, withoutEnlargement: true }).toBuffer();
  const meta = await sharp(base).metadata();
  const ratio = meta.width / meta.height;
  const target = 16 / 9;
  if (Math.abs(ratio - target) <= target * 0.1)
    return sharp(base).jpeg({ quality: 90 }).toBuffer();
  return sharp(base)
    .resize({ width: 1280, height: 720, fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 90 }).toBuffer();
}

async function saveLocal(url) {
  if (!url || url.startsWith(BASE_IMAGE_URL)) return url;
  await fs.mkdir(SHOTS_DIR, { recursive: true });
  const file = `${createHash('md5').update(url).digest('hex')}.jpg`;
  const dest = path.join(SHOTS_DIR, file);
  const pub = `${BASE_IMAGE_URL}/${file}`;
  try {
    const raw = await dl(url);
    const jpg = await crop16x9(raw);
    await fs.writeFile(dest, jpg);
    return pub;
  } catch {
    return BLANK_MARK;
  }
}

function hitAny(txt, arr) {
  return arr.some(w => txt.includes(w));
}

async function fetchCandidates(query) {
  const params = { api_key: DOG_KEY, query, results: 25, country: 'us', page: 0 };
  try {
    const { data } = await axios.get('https://api.scrapingdog.com/google_images', { params });
    const items = data.images_results || [];
    return items.map(r => {
      if (!(r.original && r.original_width && r.original_height)) return null;
      const txt = `${r.title} ${r.original}`.toLowerCase();
      if (hitAny(txt, FORBIDDEN)) return null;
      return { url: r.original, title: r.title || 'No title' };
    }).filter(Boolean).slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * główna funkcja
 */
export async function enhanceQuestion(topic, correctAnswer) {
  console.log("📚 Enhance topic:", topic);

  const userPrompt = `
You are helping build a visual quiz for TikTok.

INPUT:
- Topic: "${topic}"
- Correct Answer: "${correctAnswer}"

TASK:

1. Fake Answers:
- Return exactly 3 fake answers in a JSON array.
- All fake answers must be the same type or category as the correct answer.
- They must be real, well-known, and relevant to the topic.
- No fictional, made-up, or joke entries.

2. Google Image Search Query:
- Return one short, realistic search query a human would use in Google Images to find the best visual representation.
- Use both topic and correct answer to guide your phrasing.
- Do NOT use: poster, wallpaper, gif, logo, vector, icon, 4k, photo, HD, screenshot, still, image, thumbnail.

Return ONLY valid JSON:
{
  "fakes": ["Fake1", "Fake2", "Fake3"],
  "searchPrompt": "..."
}
`;

  let fakes = [], searchPrompt = correctAnswer;

  try {
    const { choices } = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You generate quiz data. Output only valid JSON." },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5
    });

    const text = choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    fakes = Array.isArray(parsed.fakes) ? parsed.fakes : Object.values(parsed.fakes);
    searchPrompt = parsed.searchPrompt?.trim() || searchPrompt;
  } catch (err) {
    console.error("❌ GPT JSON parse failed:", err.message);
    throw new Error("Invalid GPT output");
  }

  // Pobieramy kandydatów
  const rawCandidates = await fetchCandidates(searchPrompt);
  if (!rawCandidates.length) throw new Error('No image candidates');

  // Zapisujemy lokalnie i tworzymy listę tych które nie są BLANK
  const localImages = [];
  for (const c of rawCandidates) {
    const localUrl = await saveLocal(c.url);
    if (localUrl !== BLANK_MARK) {
      localImages.push({ title: c.title, url: localUrl });
    }
    if (localImages.length >= 5) break;
  }

  if (!localImages.length) throw new Error('All images blank');

  // Losujemy jeden z nie-blankowych
  const chosenIndex = Math.floor(Math.random() * localImages.length);
  const mediaUrl = localImages[chosenIndex].url;

  // Usuwamy pozostałe
  for (const { url } of localImages) {
    if (url !== mediaUrl) {
      const filename = url.split('/').pop();
      const filePath = path.join(SHOTS_DIR, filename);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`⚠️ Could not delete unused image ${filename}: ${err.message}`);
      }
    }
  }

  const allAnswers = [...fakes, correctAnswer].sort(() => 0.5 - Math.random());
  return {
    correctAnswer,
    fakeAnswers: allAnswers.filter(a => a !== correctAnswer),
    correctPosition: allAnswers.indexOf(correctAnswer) + 1,
    mediaType: "image",
    mediaUrl
  };
}
