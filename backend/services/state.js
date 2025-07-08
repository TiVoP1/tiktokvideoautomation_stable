// services/state.js

export const progressMap = new Map(); // jobId => { status, progress, message, videoUrl?, startedAt }

// Co 10 minut czyścimy stare joby
setInterval(() => {
  const now = Date.now();
  for (const [jobId, data] of progressMap.entries()) {
    const age = now - (data.startedAt || 0);
    if (age > 30 * 60 * 1000) { // 30 minut
      progressMap.delete(jobId);
      console.log(`🧹 Cleaned up job ${jobId} (older than 30min)`);
    }
  }
}, 10 * 60 * 1000); // co 10 minut
