// Global timing manager to ensure consistent calculations across components
class TimingManager {
  private static instance: TimingManager;
  private extrasTime: number = 0;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): TimingManager {
    if (!TimingManager.instance) {
      TimingManager.instance = new TimingManager();
    }
    return TimingManager.instance;
  }

  // Set the global extras time and notify all listeners
  setExtrasTime(seconds: number): void {
    console.log('🔥 TimingManager.setExtrasTime:', {
      oldValue: this.extrasTime,
      newValue: seconds,
      timestamp: new Date().toISOString()
    });
    
    this.extrasTime = seconds;
    this.notifyListeners();
  }

  // Get the current extras time
  getExtrasTime(): number {
    console.log('🔥 TimingManager.getExtrasTime:', {
      value: this.extrasTime,
      timestamp: new Date().toISOString()
    });
    return this.extrasTime;
  }

  // Subscribe to timing changes
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // Debug method to log current state
  debug(): void {
    console.log('🔥 TimingManager DEBUG:', {
      extrasTime: this.extrasTime,
      listenersCount: this.listeners.size,
      timestamp: new Date().toISOString()
    });
  }
}

export const timingManager = TimingManager.getInstance();

// Enhanced calculation function with detailed logging
export function calculateTotalDuration(
  questionDuration: number,
  answerDuration: number,
  resultDuration: number,
  questionCount: number,
  extrasSeconds?: number
): {
  baseSeconds: number;
  extrasSeconds: number;
  totalSeconds: number;
  formattedTime: string;
} {
  const basePerQuestion = questionDuration + answerDuration + resultDuration;
  const baseTotal = basePerQuestion * questionCount;
  const extras = extrasSeconds ?? timingManager.getExtrasTime();
  const total = baseTotal + extras;

  const result = {
    baseSeconds: baseTotal,
    extrasSeconds: extras,
    totalSeconds: total,
    formattedTime: formatDuration(total)
  };

  console.log('🔥 calculateTotalDuration:', {
    inputs: {
      questionDuration,
      answerDuration,
      resultDuration,
      questionCount,
      extrasSeconds
    },
    calculations: {
      basePerQuestion,
      baseTotal,
      extras,
      total
    },
    result,
    timestamp: new Date().toISOString()
  });

  return result;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${m}m ${s}s`;
}