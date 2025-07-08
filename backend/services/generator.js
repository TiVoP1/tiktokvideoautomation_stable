// services/generator.js
import fs from 'fs/promises';
import path from 'path';
import { randomUUID, createHash } from 'crypto';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { parseFile } from 'music-metadata';
import { generateTTS, getOrdinalText } from './elevenlabs.js';
import { transcribeWithWhisper } from './whisper.js';
import { renderFromJson } from './renderWithRemotion.js';

const OUTPUT_DIR = path.resolve('generated-json');
const SHOTS_DIR = path.resolve('public/images');
const AUDIO_DIR = path.resolve('public/audio');
const BASE_IMAGE_URL = process.env.PUBLIC_IMAGE_URL || 'http://localhost:3001/images';
const AUDIO_BASE_URL = process.env.PUBLIC_AUDIO_URL || 'http://localhost:3001/audio';
const MIN_WORD_DURATION = 0.12;


export async function generateVideo(oldQuiz, onProgress = () => {}) {
  onProgress(10, 'Parsing quiz…');
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(SHOTS_DIR, { recursive: true });
  await fs.mkdir(AUDIO_DIR, { recursive: true });

  onProgress(20, 'Generating audio…');
  const data = await convertToNewSchema(oldQuiz, onProgress);

  const fileName = `${randomUUID()}.json`;
  const jsonPath = path.join(OUTPUT_DIR, fileName);
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');

  onProgress(70, 'Rendering video… (may take few minutes)');
  const videoPath = await renderFromJson(fileName);

  // Clean up used media
  try {
    const json = data;
    const filesToDelete = [];

    if (json.intro_audio) filesToDelete.push(json.intro_audio);
    if (json.outro_audio) filesToDelete.push(json.outro_audio);
    if (json.background_music) filesToDelete.push(json.background_music);
    if (json.cta?.audio) filesToDelete.push(json.cta.audio);
    json.cut_ins?.forEach(c => c.audio && filesToDelete.push(c.audio));
    json.quiz.questions?.forEach(q => {
      if (q.begin_audio) filesToDelete.push(q.begin_audio);
      if (q.end_audio) filesToDelete.push(q.end_audio);
      if (q.shot) filesToDelete.push(q.shot);
    });

  for (const url of filesToDelete) {
    if (url.endsWith('/blank.jpg')) continue; // nie usuwaj blank.jpg
    const localPath = url.replace('http://localhost:3001', 'public');
    try {
      await fs.unlink(path.resolve(localPath));
    } catch {}
  }

  } catch (e) {
    console.warn('⚠️ Cleanup failed:', e);
  }

  onProgress(100, 'Done!');

  return {
    status: 'completed',
    message: 'Video ready',
    videoUrl: `https://videogenerator.pl/api/video/${path.basename(videoPath)}`
  };
}

//tts
async function generateTTSWithRetryQueue(tasks, delay = 1000) {
  const results = [];
  for (const t of tasks) {
    let attempt = 0;
    while (attempt < 5) {
      try {
        results.push(await generateTTS(t.text, t.style));
        break;
      } catch (e) {
        if (!String(e.message).includes('429') || attempt === 4) throw e;
        await new Promise(r => setTimeout(r, delay + attempt * 500));
        attempt++;
      }
    }
  }
  return results;
}

//captiony
async function getAccurateDuration(filePath) {
  try { const { format } = await parseFile(filePath);
        return +(format.duration || 1).toFixed(1); }
  catch { return 1; }
}

async function tryWhisper(filePath) {
  try {
    const raw = await transcribeWithWhisper(filePath);
    return raw.map(w => ({
      ...w,
      end: (w.end - w.start) < MIN_WORD_DURATION ? w.start + MIN_WORD_DURATION : w.end
    }));
  } catch (err) {
    console.warn('❌ Whisper failed:', err.message);
    return [];
  }
}

// pobieranie obrazow
/* 
musialem zaimplementowac taka logike bo nie chciałem zmieniać remotion, dzięki temu daje blank i nie ma errora
*/
async function downloadImageToPublicFolder(imageUrl) {
  if (!imageUrl || imageUrl.startsWith(BASE_IMAGE_URL)) return imageUrl;

  const hash = createHash('md5').update(imageUrl).digest('hex');
  const extInUrl = path.extname(imageUrl).split('?')[0] || '.jpg';
  const ext = (/webp|avif|jfif|heic/i).test(extInUrl) ? '.jpg' : extInUrl;
  const file = `${hash}${ext}`;
  const filePath = path.join(SHOTS_DIR, file);
  const publicUrl = `${BASE_IMAGE_URL}/${file}`;
  const needsConv = ['.webp', '.avif', '.jfif', '.heic'].includes(ext.toLowerCase());

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 sekund

  let res;
  try {
    res = await fetch(imageUrl, { signal: controller.signal });
  } finally {
    clearTimeout(timeout); 
  }

  // Retry bez timeoutu (bo fetch bez signal)
  if (!res.ok && (res.status === 403 || res.status === 406)) {
    res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://www.google.com/',
        Accept: 'image/*'
      }
    });
  }

  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image') || !res.body)
    throw new Error(`Invalid image response ${res.status} ${type}`);

  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  if (needsConv) {
    await sharp(buf).jpeg({ quality: 90 }).toFile(filePath);
  } else {
    await fs.writeFile(filePath, buf);
  }

  return publicUrl;
} catch (err) {
  console.warn(`❌ Image download failed (${imageUrl}):`, err.message);
  return `${BASE_IMAGE_URL}/blank.jpg`;
}

}


// konwersja do NOWEGO JSONA
async function convertToNewSchema(old, onProgress) {
  const { topic = '', settings = {}, questions: rawQuestions = [] } = old;
  const questions = rawQuestions.slice(0, 20); // ❗️Limit do max 20 pytań

  const extras  = settings.extras ?? {};

  //TTS
  const audioTasks = [];
  if (extras.intro) audioTasks.push({ text: extras.intro, style: 0.3 });
  if (extras.outro) audioTasks.push({ text: extras.outro, style: 0.3 });
  if (extras.cta)   audioTasks.push({ text: extras.cta,   style: 0.4 });
  for (const c of extras.cutins ?? []) audioTasks.push({ text: c.text ?? '', style: 0.4 });

  onProgress(10, 'Generating audio…');
  const audioRes = await generateTTSWithRetryQueue(audioTasks);
  const [introA,outroA,ctaA,...cutInAudios] = audioRes;

  const mark = async a=>{
    if (!a?.filePath) return;
    a.duration = await getAccurateDuration(a.filePath);
    a.captions = await tryWhisper(a.filePath);
  };
  await Promise.all([introA,outroA,ctaA,...cutInAudios].map(mark));

  // CTA i cutiny sub
  const cta = extras.cta && ctaA ? {
    text: extras.cta,
    after_question: extras.ctaAfter ?? 1,
    duration: ctaA.duration,
    audio: ctaA.url,
    captions: ctaA.captions ?? []
  } : undefined;

  const cut_ins = (extras.cutins ?? []).map((c,i)=>({
    text: c.text ?? '',
    after_question: c.after_question,
    duration: cutInAudios[i]?.duration ?? 1,
    audio:    cutInAudios[i]?.url ?? '',
    captions: cutInAudios[i]?.captions ?? []
  })).filter(c=>c.audio);

  // pytania
  const newQuestions = [];
  for (let idx = 0; idx < questions.length; idx++) {
    try {
      onProgress(30 + Math.round((idx / questions.length) * 60),
                `Processing question ${idx+1}…`);
      console.log(`🟡 Start question ${idx+1}`);

      const q = questions[idx];
      const answers = [...q.fakeAnswers];
      answers.splice(q.correctPosition - 1, 0, q.correctAnswer);

      const options = {};
      answers.forEach((a, i) => {
        options[String.fromCharCode(65 + i)] = a;
      });

      const ordinalText = getOrdinalText(idx, questions.length);
      const [ordAudio] = await generateTTSWithRetryQueue([{ text: ordinalText, style: 0.2 }]);
      console.log(`🟢 TTS ordinal OK for question ${idx+1}`);

      const [correctA] = await generateTTSWithRetryQueue([{ text: q.correctAnswer, style: 0.2 }]);
      console.log(`🟢 TTS correct answer OK for question ${idx+1}`);

      const endDur = await getAccurateDuration(correctA?.filePath);
      console.log(`🟢 Duration OK: ${endDur}`);

      const captions = await tryWhisper(correctA?.filePath);
      console.log(`🟢 Captions OK`);

      const shotUrl = await downloadImageToPublicFolder(q.mediaUrl ?? '');
      console.log(`🟢 Image OK: ${shotUrl}`);

      newQuestions.push({
        question_id: idx + 1,
        shot: shotUrl,
        question_text: 'Z jakiego filmu pochodzi ta scena?',
        options,
        correct_option: String.fromCharCode(64 + q.correctPosition),
        begin_audio: ordAudio.url,
        end_audio: correctA.url,
        end_audio_duration: endDur,
        captions
      });
    } catch (err) {
      console.error(`❌ Error in question ${idx+1}:`, err);
      throw err; // albo kontynuuj dalej
    }
  }


  // topic theme kopiowanie
  const cleanTopic = topic.replace(/^Quiz:\s*/i,'');

  //finaj JSON
  return {
    topic: cleanTopic,
    theme: settings.theme ?? null,
    label_style: settings.labelStyle ?? null,
    video_format: '9:16',

    // tło obraz + wideo z offsetami
    background: settings.backgroundImage || settings.background || '',
    background_offset: settings.bgVideoStartOffset ?? 0,

    // bacground music + offset 
    background_music: settings.backgroundMusic ?? null,
    background_music_offset: settings.musicStartOffset ?? 0,

    watermark: settings.brandingText ?? null,
 
    ...(introA && {
      intro_duration: introA.duration,
      intro_audio: introA.url,
      intro_audio_captions: introA.captions
    }),
    ...(outroA && {
      outro_duration: outroA.duration,
      outro_audio: outroA.url,
      outro_audio_captions: outroA.captions
    }),

    animation_duration: settings.questionDuration ?? 1,
    table_duration:     settings.resultDuration ?? 1,

    ...(cta && { cta }),
    ...(cut_ins.length && { cut_ins }),

    quiz: {
      title: cleanTopic,
      questions: newQuestions
    }
  };
}
