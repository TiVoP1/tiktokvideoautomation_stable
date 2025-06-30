type CutIn = {
  after_question: number;
  duration?: number;
};

type Question = {
  question_id: number;
  end_audio_duration?: number;
};

type SceneT = 'intro' | 'question' | 'cta' | 'cutin' | 'summary' | 'outro';

type Data = {
  intro_duration?: number;
  outro_duration?: number;
  table_duration?: number;
  animation_duration?: number;
  cta?: {
    after_question?: number;
    duration?: number;
  };
  cut_ins?: CutIn[];
  quiz?: {
    questions?: Question[];
  };
};

/**
 * Calculates total timeline length in frames, mirroring the render logic in MainComposition.
 */
export const getTotalDurationFromData = (data: Data, fps: number): number => {
  const intro = data.intro_duration ?? 0;
  const outro = data.outro_duration ?? 0;
  const table = data.table_duration ?? 0;
  const anim = data.animation_duration ?? 0;

  const PRE = 1; // seconds (pre-animation)
  const OVERLAP = 1; // seconds (shared window)

  const questions = data.quiz?.questions ?? [];

  let total = intro; // seconds so far
  let prev: SceneT = 'intro';

  questions.forEach((q, idx) => {
    const reveal = Math.max(1, q.end_audio_duration ?? 1);
    let qSec = PRE + anim + reveal;
    const id = q.question_id ?? idx + 1;

    // Question may start early
    if (prev === 'intro' || prev === 'cta' || prev === 'cutin') qSec -= OVERLAP;
    total += qSec;
    prev = 'question';

    // CTA (no early start)
    if (data.cta?.after_question === id) {
      total += data.cta.duration ?? 0;
      prev = 'cta';
    }

    // Cut-ins (no early start, sum)
    const cuts = (data.cut_ins ?? []).filter((c) => c.after_question === id);
    if (cuts.length) {
      total += cuts.reduce((s, c) => s + (c.duration ?? 0), 0);
      prev = 'cutin';
    }

    // SummaryTable between questions – starts early but we count only visible part
    const isLast = idx === questions.length - 1;
    const showTable = !isLast && table > 0 &&
      data.cta?.after_question !== id && cuts.length === 0;

    if (showTable) {
      total += table; // 1-s overlap pochodzi z wcześniejszego Question
      prev = 'summary';
    }
  });

  // Outro (full length, no early start)
  total += outro;

  return Math.ceil(total * fps);
};