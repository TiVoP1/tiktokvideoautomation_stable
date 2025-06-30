import { AbsoluteFill } from 'remotion';

export const CTABlock = ({ text }: { text?: string }) => {
  if (!text) return null;

  return (
    <AbsoluteFill className="flex items-center justify-center text-white text-4xl font-bold px-4 text-center">
    </AbsoluteFill>
  );
};
