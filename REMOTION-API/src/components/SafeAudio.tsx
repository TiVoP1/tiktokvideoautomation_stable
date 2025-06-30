import { Audio } from 'remotion';

export const SafeAudio = ({
  src,
  volume = 1,
  startFrom = 0,
  endAt,
  loop = false,
}: {
  src?: string;
  volume?: number;
  startFrom?: number;
  endAt?: number;
  loop?: boolean;
}) => {
  if (!src) return null;

  return (
    <Audio
      src={src}
      volume={volume}
      startFrom={startFrom}
      endAt={endAt}
      loop={loop}
    />
  );
};
