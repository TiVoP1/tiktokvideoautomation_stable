import { AbsoluteFill } from 'remotion';

export const BrandingWatermark = ({ text }: { text?: string }) => {
  if (!text) return null;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 60, //40 bylo za nisko
          width: '100%',
          textAlign: 'center',
          fontSize: 24,
          fontFamily: '"Segoe UI", sans-serif',
          color: '#ffffffaa', // zwiększona przeźroczystość (wcześniej było #ffffff)
          fontWeight: 500,
          letterSpacing: 0.5,
          textShadow: '0px 0px 6px rgba(0, 0, 0, 0.4)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
