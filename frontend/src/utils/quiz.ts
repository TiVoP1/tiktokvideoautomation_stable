/* ────────── Quiz types ────────── */

/* ––– pojedynczy cut-in (timingi) ––– */
export interface CutIn {
  after_question: number;   // po którym pytaniu
  text: string;             // treść wstawki
}

/* ––– pytanie ––– */
export interface QuizQuestion {
  id: string;
  correctAnswer: string;
  fakeAnswers: string[];
  correctPosition: number;
  mediaType: 'image' | 'video' | 'audio' | 'none';
  mediaUrl?: string;
  topic?: string;           // dziedziczone z quiz.topic
}

/* ––– ustawienia quizu ––– */
export interface QuizSettings {
  /* 1. oprawa wizualna */
  labelStyle: 'abc' | '123';
  theme: 'modern' | 'dark' | 'retro' | 'corporate';
  videoFormat: '16:9' | '9:16' | '1:1';    // zawsze wyślemy „9:16”
  logo?: string;
  backgroundMusic?: string;
  backgroundImage?: string;
  brandingText?: string;

  /* 2. czasy ekranów */
  questionDuration: number;
  answerDuration: number;   // wykorzystywane tylko w edi­torze,
  resultDuration: number;   // backend dostaje już bez niego

  /** 3. dodatkowe wstawki (intro/outro/CTA/cut-ins) */
  extras?: {
    intro: string;
    outro: string;
    cta: string;
    ctaAfter: number;       // numer pytania po którym pokazujemy CTA
    cutins: CutIn[];
  };

  /** 4. pre-liczony łączny czas extrasów (ułatwia kalkulację) */
  extrasSeconds?: number;
}

/* ––– cały projekt ––– */
export interface QuizProject {
  id?: string;
  title: string;
  topic: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ––– status zwracany z render-backendu ––– */
export interface GenerationStatus {
  status: 'idle' | 'generating' | 'completed' | 'error';
  progress: number;   // 0–100
  message: string;
  videoUrl?: string;  // gdy completed
}
