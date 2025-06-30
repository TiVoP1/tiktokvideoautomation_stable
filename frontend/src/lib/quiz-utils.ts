import { QuizQuestion, QuizProject, QuizSettings } from '@/types/quiz';

/* ───────────── Helpers do quizu ───────────── */

export const generateQuestionId = (): string =>
  `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const createDefaultQuestion = (correctAnswer: string): QuizQuestion => ({
  id: generateQuestionId(),
  correctAnswer: correctAnswer.trim(),
  fakeAnswers: [],
  correctPosition: 1,
  mediaType: 'none'
});

export const shuffleAnswers = (question: QuizQuestion): string[] => {
  const { correctAnswer, fakeAnswers, correctPosition } = question;
  const all = [...fakeAnswers];
  all.splice(correctPosition - 1, 0, correctAnswer);
  return all;
};

export const getAnswerLabel = (
  index: number,
  labelStyle: 'abc' | '123'
): string => (labelStyle === '123' ? `${index + 1}` : String.fromCharCode(65 + index));

export const validateQuestion = (q: QuizQuestion): string[] => {
  const err: string[] = [];
  if (!q.correctAnswer.trim()) err.push('Poprawna odpowiedź jest wymagana');
  if (q.fakeAnswers.length < 1) err.push('Wymagana jest przynajmniej jedna fałszywa odpowiedź');
  if (q.correctPosition < 1 || q.correctPosition > q.fakeAnswers.length + 1)
    err.push('Nieprawidłowa pozycja poprawnej odpowiedzi');
  return err;
};

/* ───────────── Legacy timing function (DEPRECATED - use timing-manager.ts) ───────────── */

export const calculateQuizDuration = (
  settings: QuizSettings,
  questionCount: number,
  extrasSeconds?: number
) => {
  console.warn('🚨 DEPRECATED: calculateQuizDuration - use timing-manager.ts instead');
  
  const extras = extrasSeconds !== undefined ? extrasSeconds : (settings.extrasSeconds ?? 0);
  const questionBlock = (settings.questionDuration ?? 4) + (settings.answerDuration ?? 1) + (settings.resultDuration ?? 1);
  const totalSeconds = parseFloat((questionBlock * questionCount + extras).toFixed(1));
  const totalMinutes = Math.ceil(totalSeconds / 60);

  const min = Math.floor(totalSeconds / 60);
  const sec = (totalSeconds % 60).toFixed(1);
  const formattedTime = min > 0 ? `${min}m ${sec}s` : `${sec}s`;

  return {
    totalSeconds,
    totalMinutes,
    formattedTime: formattedTime.trim(),
    perQuestionSeconds: totalSeconds
  };
};

/* ───────────── Format helper ───────────── */

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${m}m ${s}s`;
};