import { useCurrentFrame, interpolate } from 'remotion';

export const FadeInOutWrapper = ({
  durationInFrames,
  children,
}: {
  durationInFrames: number;
  children: React.ReactNode;
}) => (
  <div
    style={{
      opacity: interpolate(
        useCurrentFrame(),
        [0, 8, durationInFrames - 8, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ),
    }}
  >
    {children}
  </div>
);
