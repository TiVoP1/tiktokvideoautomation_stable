// services/quizGenerator.js
import { runUntilSuccess } from './gpt.js';
import { generateOptions } from '../utils/helpers.js';

// Refine (od frontu 2.5)
export async function refineTopic(userInput) {
  const input = {
    prompt: `
Your task is to slightly improve the clarity of a user-provided quiz topic, but **never change its original intent**.

INPUT TOPIC:
"${userInput}"

INSTRUCTIONS:
- Do NOT change the intended meaning of the topic.
- If the topic mentions "screenshot", "photo", "childhood", "frame", "landmark", etc. — these visual clues **must remain** in the refined version.
- If the topic is already clear, return it unchanged or improve only grammar/fluency.
- Do NOT rewrite the topic into something else (e.g. don't replace "game screenshot" with "iconic character").
- Your goal is to help make the topic visually precise and suitable for an image-based quiz on TikTok.
- Use natural phrasing like:
  - Guess the ___ from the ___
  - Identify the ___
  - Which ___ is this?
  - Name the ___ from ___

Return ONLY the refined topic string. No explanation. No formatting.
`,
    system_prompt: "You are refining quiz topics for TikTok. Your job is to keep the original intent intact.",
    temperature: 0.6,
  };

  const raw = await runUntilSuccess("openai/gpt-4o", input);
  return String(raw).trim().replace(/^"|"$/g, "");
}



// oryginalny topic (meh)
export async function generateQuizTopic() {
  const input = {
    prompt: `Generate a unique, clear, and specific quiz topic ideal for a video quiz with multiple choice answers labeled A, B, C, D.
The topic must be visually recognizable and suitable for image-only quizzes (no audio or video-based topics). It must be easilably searchable in internet so for example "Name the Painting from the Artist's Signature" is bad topic"
Examples: "Guess the Movie from One Scene", "Identify the Animal by Its Picture", "Name the Country from Its Flag".
Return only the topic string. No explanations, no quotation marks.`,
    system_prompt: "You are a quiz topic generator for short-form video. Return only a concise, visual topic for 4-answer image-based quizzes.",
    temperature: 1,
    max_completion_tokens: 100
  };

  const raw = await runUntilSuccess("openai/gpt-4o", input);
  return String(raw).trim().replace(/^"|"$/g, "");
}

//correct answers
export async function generateQuestionsFromTopic(inputTopic, count = 5) {
  if (!inputTopic) throw new Error("Topic is required for generating questions.");

  const refinedTopic = await refineTopic(inputTopic);
  console.log(`🎯 Input topic: "${inputTopic}" → Refined: "${refinedTopic}"`);

  const system_prompt = "You generate visual multiple choice quiz answers. Return only valid JSON with keys 1, 2, 3, etc.";

  let attempts = 0;
  const seenAnswers = new Set();
  let finalQuestions = [];

  while (attempts < 5 && finalQuestions.length < count) {
    attempts++;

    const prompt = `You are generating answers for a multiple-choice quiz with the topic: "${refinedTopic}".
Return exactly ${count} unique, short answers (1–3 words max) that directly match the level of abstraction of the topic.

Instructions:
- The answers must NOT be examples or parts of the topic. They must be the actual items the topic asks for.
- For example, if the topic is "Identify the Movie", answers should be MOVIE TITLES (not locations or characters from them).
- If the topic is about animals, answers should be animal names, not their parts or breeds.
- Each answer must be visually representable and image-searchable.
- Avoid programming languages, syntax, abstract concepts, fictional gibberish, or country names (unless relevant).

Return only valid JSON in the form:
{
  "1": "Answer",
  "2": "Answer",
  ...
}`;

    const input = {
      prompt,
      system_prompt,
      temperature: 0.8,
      top_p: 1,
      max_completion_tokens: 1000
    };

    let itemMap = {};
    try {
      const raw = await runUntilSuccess("openai/gpt-4o", input);
      const rawString = typeof raw === "string" ? raw : JSON.stringify(raw);
      const fixedJson = rawString.replace(/(\d+)\s*:/g, '"$1":');

      const jsonMatch = fixedJson.match(/\{[\s\S]*?\}/)?.[0];
      if (!jsonMatch) throw new Error("No JSON block found.");
      itemMap = JSON.parse(jsonMatch);
    } catch (err) {
      console.error("❌ Failed to parse JSON from GPT response");
      continue;
    }

    const questions = Object.entries(itemMap)
      .map(([id, label]) => {
        if (
          typeof label !== "string" ||
          label.length > 50 ||
          /(language|syntax|programming|javascript|python|c\+\+|binary|code|concept)/i.test(label) ||
          /[^a-zA-Z0-9\s:'",.!?()&-]/.test(label)
        ) {
          return null;
        }

        const normalized = label.trim().toLowerCase();
        if (seenAnswers.has(normalized)) return null;
        seenAnswers.add(normalized);

        const options = generateOptions(label);

        return {
          id: `q${id}`,
          correctAnswer: label,
          fakeAnswers: Object.values(options).filter(val => val !== label),
          correctPosition: Object.entries(options).findIndex(([_, val]) => val === label) + 1,
          mediaType: 'image',
          mediaUrl: '',
          topic: refinedTopic
        };
      })
      .filter(Boolean);

    finalQuestions.push(...questions);
    finalQuestions = finalQuestions.slice(0, count); // limit
  }

  if (finalQuestions.length < count) {
    throw new Error(`❌ Failed to generate at least ${count} unique questions after ${attempts} attempts`);
  }

  return {
    title: `Quiz: ${refinedTopic}`,
    topic: refinedTopic,
    questions: finalQuestions,
    settings: {
      labelStyle: 'abc',
      theme: 'modern',
      videoFormat: '16:9',
      questionDuration: 4,
      answerDuration: 1,
      resultDuration: 1
    }
  };
}


