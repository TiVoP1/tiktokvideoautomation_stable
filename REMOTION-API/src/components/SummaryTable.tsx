import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

type Theme = { value: string; label: string; colors: string[]; bg: string; text: string };
type SummaryTableProps = { answers: string[]; totalQuestions: number; theme: Theme };

export const SummaryTable = ({ answers, totalQuestions, theme }: SummaryTableProps) => {
  const frame = useCurrentFrame();

  // animacje wejścia
  const scale = interpolate(frame, [0, 20], [0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ile poprawnych
  const correct = answers.filter(Boolean).length;

  // ------------------------------------------------ UI
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        color: theme.text,
        padding: '32px 24px',
        textAlign: 'left',

        /* MASKA przyciemniająca tło */
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '32px 28px',
          borderRadius: 32,

          /* mocniejszy glass */
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)',
          border: '2px solid rgba(255,255,255,0.35)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',

          transform: `scale(${scale})`,
          opacity,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* subtelny gradient dekoracyjny */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(45deg, ${theme.colors?.[0] || '#6366f1'}22, ${
              theme.colors?.[1] || '#8b5cf6'
            }22)`,
            borderRadius: 32,
          }}
        />

        {/* ---------------- HEADER ---------------- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
              boxShadow: '0 8px 20px rgba(251,191,36,.5)',
              fontSize: 24,
            }}
          >
            🏆
          </div>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 0.5,
              margin: 0,
              background: `linear-gradient(135deg,${theme.text} 0%,${theme.text}cc 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Correct Answers
          </h2>
        </div>

        {/* ---------------- PROGRESS BAR ---------------- */}
        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 999, marginBottom: 24, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              height: '100%',
              width: `${(correct / totalQuestions) * 100}%`,
              background: 'linear-gradient(90deg,#10b981 0%,#059669 100%)',
              borderRadius: 999,
              boxShadow: '0 0 10px rgba(16,185,129,0.5)',
            }}
          />
        </div>

        {/* ---------------- SCORE ---------------- */}
        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>Score:</span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              marginLeft: 8,
              background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {correct}/{totalQuestions}
          </span>
        </div>

        {/* ---------------- LISTA ODPOWIEDZI ---------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
          {Array.from({ length: totalQuestions }, (_, i) => {
            const answer = answers[i] ?? '';
            const itemDelay = 20 + i * 4;
            const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const itemX = interpolate(frame, [itemDelay, itemDelay + 10], [-30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const good = Boolean(answer);

            return (
              <div
                key={i}
                style={{
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: good ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.08)',
                  border: good ? '2px solid rgba(16,185,129,0.35)' : '2px solid rgba(255,255,255,0.17)',
                  color: good ? theme.text : `${theme.text}66`,
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  userSelect: 'none',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'inset 0 0 6px rgba(0,0,0,0.35)', // delikatny cień wewn.
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: good ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                    fontSize: 14,
                    fontWeight: 700,
                    border: good ? '2px solid rgba(16,185,129,0.55)' : '2px solid rgba(255,255,255,0.25)',
                  }}
                >
                  {i + 1}
                </div>

                <span style={{ flex: 1 }}>{answer || 'Not answered'}</span>

                {good && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(16,185,129,0.85)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 12,
                      fontSize: 14,
                      boxShadow: '0 2px 8px rgba(16,185,129,0.45)',
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
