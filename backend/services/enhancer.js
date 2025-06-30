import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GPT_API
});

const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY;

//'meme' usuniete bo quiz może być o memach, trzeba bedzie dorobić soft forbidden
const FORBIDDEN_WORDS = [
  'watermark', 'text', 'quote', 'gif', '4k', 'funny', 'lobes', 'sinus'
];


async function fetchBestImagesFromScrapingDog(query, count = 10) {
  const url = "https://api.scrapingdog.com/google_images";
  const params = {
    api_key: SCRAPINGDOG_API_KEY,
    query,
    results: count,
    country: "us",
    page: 0
  };

  try {
    const response = await axios.get(url, { params });
    const images = response.data.images_results || [];

    if (images.length === 0) {
      console.warn("⚠️ ScrapingDog returned 0 images.");
      return [];
    }

    const preferredRatio = 16 / 9;
    const tolerance = 0.2;

    const filtered = images
      .map(img => {
        const errors = [];
        if (!img.original_width || !img.original_height) errors.push("Missing dimensions");
        if (!img.original) errors.push("Missing URL");

        const title = img.title?.toLowerCase() || "";
        const url = img.original?.toLowerCase() || "";
        if (FORBIDDEN_WORDS.some(word => title.includes(word) || url.includes(word))) {
          errors.push("Contains forbidden word");
        }

        const ratio = img.original_width / img.original_height;
        const delta = Math.abs(ratio - preferredRatio);
        const penalizedDelta = delta > tolerance ? delta * 5 : delta;

        return errors.length === 0 ? {
          url: img.original,
          title: img.title || "No title",
          ratio,
          delta: penalizedDelta
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, Math.min(count, 5));

    if (filtered.length === 0) {
      console.warn("⚠️ All images were filtered out. Try relaxing filters or using a different query.");
    }

    return filtered;
  } catch (err) {
    console.error("❌ ScrapingDog failed:", err?.response?.data?.message || err.message);
    return [];
  }
}



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

  let fakeData;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You generate quiz data. Output only valid JSON." },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed.fakes)) {
      parsed.fakes = Object.values(parsed.fakes);
    }

    fakeData = parsed;
  } catch (err) {
    console.error("❌ GPT JSON parse failed:", err.message);
    throw new Error("Invalid GPT output");
  }

  const fakes = fakeData.fakes || [];
  const searchPrompt = fakeData.searchPrompt?.trim() || correctAnswer;

  const allAnswers = [...fakes, correctAnswer].sort(() => 0.5 - Math.random());
  const correctPosition = allAnswers.indexOf(correctAnswer) + 1;

  const imageMeta = await fetchBestImagesFromScrapingDog(searchPrompt, 10);
  const imageUrls = imageMeta.map(img => img.url);

  let mediaUrl = imageUrls[0];

  if (imageMeta.length > 0) {
    const visionPrompt = `
You're selecting the best image for a TikTok quiz.

Topic: "${topic}"
Correct answer: "${correctAnswer}"

Select the best among all image titles:
- Visually aesthetic, cinematic
- No text, watermark, logos
- Do NOT make the answer too obvious
- Choose only a single, clear photo of one object (e.g. one leaf)
- Reject diagrams, labeled images, or those showing multiple examples
- Avoid educational or scientific reference images if possible
- No memes, quotes, or baby photos

Respond ONLY with number 1–all of the photos numbers.
YOU MUST PICK ONE!

${imageMeta.map((img, i) => `${i + 1}. ${img.title}`).join("\n")}
`;

    try {
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Pick best quiz image from 5 shown. Respond with number 1–5 only." },
          { role: "user", content: visionPrompt }
        ],
        temperature: 0.2
      });

      const answer = visionResponse.choices[0].message.content;
      const match = answer.match(/[1-5]/);
      const chosenIndex = match ? parseInt(match[0], 10) - 1 : 0;

      mediaUrl = imageUrls[chosenIndex];
      console.log("✅ GPT Vision selected image:", imageMeta[chosenIndex].title);
    } catch (err) {
      console.error("⚠️ GPT Vision failed, using first image.");
    }
  } else {
    console.warn("⚠️ No valid images after filtering.");
  }

  return {
    correctAnswer,
    fakeAnswers: allAnswers.filter(a => a !== correctAnswer),
    correctPosition,
    mediaType: "image",
    mediaUrl
  };
}
