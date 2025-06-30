import { runUntilSuccess } from "./gpt.js";

//Generowanie intro CTA Cutins outro
export async function generateTiming(topic, questionCount, answerSec = 1) {
 const prompt = `
You are writing dynamic scripts for viral TikTok-style quizzes.

INPUT
- Topic: "${topic}"
- Total questions: ${questionCount}
- Seconds to answer each question: ${answerSec}

OUTPUT STRUCTURE (MUST MATCH EXACTLY)
{
  "intro": "string",
  "cta": "string",
  "ctaAfter": number,
  "cutins": [
    { "after_question": number, "text": "string" }
  ],
  "outro": "string"
}

WRITING RULES:

🎬 Intro
- Hook the viewer IMMEDIATELY to take the quiz about the topic.
- Include the rule: “you only have ${answerSec} second${answerSec === 1 ? '' : 's'}” to answer.
- Must feel punchy and exciting (no greetings or soft intros).

📣 CTA
- One line (max 120 characters) to push Like / Comment / Follow.
- Should feel urgent, playful, or reward-seeking.
- Place it right at the ⌈N/2⌉ question and return only the number to ctaAfter

💥 Cut-ins
- Number:
  - 1 cut-in  for 5–9 questions
  - 2 cut-ins for 10–14
  - 3 cut-ins for 15+
- Each cut-in must:
  - Feel spontaneous and fun
  - Fit TikTok vibe (e.g. "This one’s a brain bender", "Wait for it...")
  - Avoid cliches like "You're halfway there"
  - Avoid exclamation marks
- Spread them evenly. Do not overlap with CTA.
- It must be inserted no later than before the penultimate question so if there are 5 it should be no later than 4 etc

🏁 Outro
- Ask the viewer if they got them all right.
- Encourage comment or share.
- Must feel short and snappy, like TikTok closers.
`;


  const input = {
    prompt,
    system_prompt: "Return ONLY the JSON object. No markdown.",
    temperature: 0.6,
    max_completion_tokens: 300
  };

  //GPT untilsucsess
  const raw = await runUntilSuccess("openai/gpt-4o", input);

  //Ekstrakcja JSONA
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON block in GPT response");
  return JSON.parse(match[0]);
}
