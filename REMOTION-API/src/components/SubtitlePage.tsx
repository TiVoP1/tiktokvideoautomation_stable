import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Page } from "./Page";
import { TikTokPage } from "@remotion/captions";

const SubtitlePage: React.FC<{ readonly page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bezpieczne fallback na fps = 30, jeśli undefined
  const safeFps = fps || 30;

const enter = spring({
  frame,
  fps: fps || 30,
  config: {
    damping: 22,
    mass: 0.5,
    stiffness: 80,
  },
  durationInFrames: 7,
});



  return (
    <AbsoluteFill
      style={{
        position: "absolute",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <Page enterProgress={enter} page={page} />
    </AbsoluteFill>
  );
};

export default SubtitlePage;
