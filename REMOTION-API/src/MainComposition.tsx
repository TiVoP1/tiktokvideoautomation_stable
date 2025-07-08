import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, Audio, useVideoConfig } from 'remotion';
import { QuestionScene } from './components/QuestionScene';
import { Background } from './components/Background';
import { CTABlock } from './components/CTABlock';
import { SummaryTable } from './components/SummaryTable';
import { FadeInOutWrapper } from './components/FadeInOutWrapper';

// usunecie erora Fadeinwrappera
type FadeWrapperProps = React.ComponentProps<typeof FadeInOutWrapper> & {
  fadeOutEarlyFrames?: number;
};
const Fade = FadeInOutWrapper as unknown as React.FC<FadeWrapperProps>;
import { SafeAudio } from './components/SafeAudio';
import { BrandingWatermark } from './components/BrandingWatermark';
import SubtitlePage from './components/SubtitlePage';
import themes from './constants/themes';

const fps = 30;
const TIMER_AUDIO_URL = 'http://localhost:3001/assets/timer.mp3';
const OVERLAP_FR = 1 * fps; 
const EARLY_FADE_FR = 0.5 * fps; // fade‑out inside Question

type SceneT = 'intro' | 'question' | 'cta' | 'cutin' | 'summary' | 'outro';

export const MainComposition = ({ data }: { data: any }) => {
  const {
    background,
    background_music,
    background_offset = 0,
    intro_duration,
    background_music_offset = 0,
    outro_duration,
    animation_duration,
    table_duration,
    cta,
    cut_ins,
    intro_audio,
    outro_audio,
    intro_audio_captions,
    outro_audio_captions,
    watermark,
    quiz: { questions },
    label_style = 'abc',
  } = data;

  const theme = useMemo(() => themes.find((t) => t.value === data.theme) || themes[0], [data.theme]);

  const sequences: React.ReactElement[] = [];
  const answers: string[] = [];
  let currentFrame = 0;
  let prevScene: SceneT = 'intro';

  //helpers
const renderCaptions = (
  raw: { text: string; start: number; end: number }[],
  id: string
) => {
  if (!Array.isArray(raw) || raw.length === 0) {
    console.warn(`⚠️ Empty or invalid caption data for: ${id}`);
    return null;
  }

  const tokens = raw.map((c) => ({
    text: c.text,
    fromMs: c.start * 1000,
    toMs: c.end * 1000,
  }));

  const pages: { startMs: number; tokens: typeof tokens }[] = [];
  for (let i = 0; i < tokens.length; i += 3) {
    pages.push({ startMs: tokens[i].fromMs, tokens: tokens.slice(i, i + 3) });
  }

  return pages.map((p, idx) => {
    const nextPage = pages[idx + 1];
    const sF = Number.isFinite(p.startMs)
      ? Math.floor((p.startMs / 1000) * fps)
      : 0;

    const lastEnd = p.tokens[p.tokens.length - 1]?.toMs ?? p.startMs + 1000;
    const eF = nextPage && Number.isFinite(nextPage.startMs)
      ? Math.floor((nextPage.startMs / 1000) * fps) - 2
      : Math.ceil((lastEnd / 1000) * fps);

    const duration = eF - sF;

    if (!Number.isFinite(sF) || !Number.isFinite(duration) || duration <= 0) {
      console.warn(
        `⚠️ Invalid subtitle sequence skipped: sF=${sF}, eF=${eF}, duration=${duration}`
      );
      return null;
    }

    return (
      <Sequence key={`${id}-${idx}`} from={sF} durationInFrames={duration}>
        <SubtitlePage
          page={{
            startMs: p.startMs,
            text: p.tokens.map((t) => t.text).join(" "),
            tokens: p.tokens,
            durationMs: lastEnd - p.startMs,
          }}
        />
      </Sequence>
    );
  });
};


  // Intro
const introF = (Number(intro_duration) || 0) * fps;

if (!Number.isFinite(introF) || introF <= 0 || !Number.isFinite(currentFrame)) {
  console.warn(`⚠️ Skipping intro: introF=${introF}, currentFrame=${currentFrame}`);
} else {
  sequences.push(
    <Sequence key="intro" from={currentFrame} durationInFrames={introF}>
      <SafeAudio src={intro_audio} />
      {Array.isArray(intro_audio_captions) && renderCaptions(intro_audio_captions, 'intro')}
    </Sequence>
  );
  currentFrame += introF;
  prevScene = 'intro';
}


  // Questions
  questions.forEach((q: any, idx: number) => {
    const id = idx + 1;
    const baseF = animation_duration * fps;
    const revealF = Math.max(fps, Math.round((q.end_audio_duration || 1) * fps));
    const totalQF = fps + baseF + revealF; // 1 s pre‑anim + main + reveal

    // logika overlapow: pytane zaczyna sie wczesniej tylko jest wczsniejsza scena ma jak oddac 1s(Intro/Cta/Cut‑in)
    const qStartEarly = prevScene === 'intro' || prevScene === 'cta' || prevScene === 'cutin';
    const qStart = qStartEarly ? currentFrame - OVERLAP_FR : currentFrame;

const isQStartValid = Number.isFinite(qStart);
const isDurationValid = Number.isFinite(totalQF) && totalQF > 0;

if (!isQStartValid || !isDurationValid) {
  console.warn(`⚠️ Skipping question #${id} due to invalid timing. qStart=${qStart}, totalQF=${totalQF}`);
} else {
  sequences.push(
    <Sequence key={`q-${id}`} from={qStart} durationInFrames={totalQF}>
      <Sequence from={fps} durationInFrames={baseF}>
        <SafeAudio src={TIMER_AUDIO_URL} loop volume={0.6} />
      </Sequence>

      {q.begin_audio && (
        <Sequence from={fps} durationInFrames={3 * fps}>
          <SafeAudio src={q.begin_audio} />
        </Sequence>
      )}

      {q.end_audio && (
        <Sequence from={fps + baseF} durationInFrames={revealF}>
          <SafeAudio src={q.end_audio} />
          {Array.isArray(q.captions) && renderCaptions(q.captions, `qcap-${id}`)}
        </Sequence>
      )}

      <Fade
        durationInFrames={totalQF}
        fadeOutEarlyFrames={
          table_duration > 0 &&
          idx < questions.length - 1 &&
          !(cta?.after_question === id) &&
          !(cut_ins || []).some((c: any) => c.after_question === id)
            ? EARLY_FADE_FR
            : 0
        }
      >
        <QuestionScene
          imageUrl={q.shot}
          options={q.options}
          correctOption={q.correct_option}
          durationInFrames={baseF}
          preAnimationDuration={fps}
          revealAnimationDuration={revealF}
          textColor={theme.text}
          labelStyle={label_style}
        />
      </Fade>
    </Sequence>
  );
}


    currentFrame += totalQF - (qStartEarly ? OVERLAP_FR : 0);
    prevScene = 'question';
    answers.push(q.options[q.correct_option]);

    // CTA brak initial overlapa
    const ctaHere = cta?.after_question === id;
if (ctaHere) {
  const ctaF = (Number(cta?.duration) || 0) * fps;

  if (!Number.isFinite(ctaF) || ctaF <= 0 || !Number.isFinite(currentFrame)) {
    console.warn(`⚠️ Skipping CTA after Q${id}: ctaF=${ctaF}`);
  } else {
    sequences.push(
      <Sequence key={`cta-${id}`} from={currentFrame} durationInFrames={ctaF}>
        <SafeAudio src={cta.audio} />
        {Array.isArray(cta.captions) && renderCaptions(cta.captions, `cta-${id}`)}
        <Fade durationInFrames={ctaF}>
          <CTABlock text={cta.text} />
        </Fade>
      </Sequence>
    );
    currentFrame += ctaF;
    prevScene = 'cta';
  }
}


    // Cutny (brak overlap poczatek)
const cuts = (cut_ins || []).filter((c: any) => c.after_question === id);
cuts.forEach((cut: any, ci: number) => {
  const cutF = (Number(cut?.duration) || 0) * fps;

  if (!Number.isFinite(cutF) || cutF <= 0 || !Number.isFinite(currentFrame)) {
    console.warn(
      `⚠️ Skipping cut-in #${ci} after Q${id}: cutF=${cutF}, currentFrame=${currentFrame}`
    );
    return; // ⛔ zatrzymaj pętlę dla tego cuta
  }

  sequences.push(
    <Sequence key={`cut-${id}-${ci}`} from={currentFrame} durationInFrames={cutF}>
      <SafeAudio src={cut.audio} />
      {Array.isArray(cut.captions) && renderCaptions(cut.captions, `cut-${id}-${ci}`)}
    </Sequence>
  );
  currentFrame += cutF;
  prevScene = 'cutin';
});


    // teabele
const isLastQ = idx === questions.length - 1;
const rawTableDuration = Number(table_duration) || 0;
const showTable = !isLastQ && !ctaHere && cuts.length === 0 && rawTableDuration > 0;

if (showTable) {
  const tableF = rawTableDuration * fps + OVERLAP_FR;
  const tableStart = currentFrame - OVERLAP_FR;

  if (!Number.isFinite(tableF) || tableF <= 0 || !Number.isFinite(tableStart)) {
    console.warn(
      `⚠️ Skipping summary table after Q${id}: tableF=${tableF}, tableStart=${tableStart}`
    );
  } else {
    sequences.push(
      <Sequence key={`table-${id}`} from={tableStart} durationInFrames={tableF}>
        <Fade durationInFrames={tableF}>
          <SummaryTable
            answers={answers.slice(0, id)}
            totalQuestions={questions.length}
            theme={theme}
          />
        </Fade>
      </Sequence>
    );

    currentFrame += tableF - OVERLAP_FR;
    prevScene = 'summary';
  }
}

  });

  // -------------------------------- Outro (full table overlay) -----------
const outroF = (Number(outro_duration) || 0) * fps;

if (!Number.isFinite(outroF) || outroF <= 0 || !Number.isFinite(currentFrame)) {
  console.warn(`⚠️ Skipping outro: outroF=${outroF}, currentFrame=${currentFrame}`);
} else {
  sequences.push(
    <Sequence key="outro" from={currentFrame} durationInFrames={outroF}>
      <SafeAudio src={outro_audio} />
      {Array.isArray(outro_audio_captions) && renderCaptions(outro_audio_captions, 'outro')}
      <Fade durationInFrames={outroF}>
        <SummaryTable
          answers={answers}
          totalQuestions={questions.length}
          theme={theme}
        />
      </Fade>
    </Sequence>
  );
  currentFrame += outroF;
}

  currentFrame += outroF;

  //Render (muzyka XDD)
  return (
    <AbsoluteFill className="font-sans bg-black text-white">
      <Background
        url={background}
        offset={background_offset}   // ⬅ dodane
        fallbackStyle={{ background: theme.bg, color: theme.text }}
      />

{background_music && (
  <Sequence from={0} durationInFrames={currentFrame}>
    <Audio
      src={background_music}
      trimBefore={Math.round(background_music_offset * fps)}
      volume={0.03}
    />
  </Sequence>
)}






      {sequences}
      <BrandingWatermark text={watermark} />
    </AbsoluteFill>
  );
};
