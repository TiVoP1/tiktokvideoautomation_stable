import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "./load-font";
import { fitText } from "@remotion/layout-utils";
import { makeTransform, scale, translateY } from "@remotion/animation-utils";
import type { TikTokPage } from "@remotion/captions";

const fontFamily = TheBoldFont;

const container: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  top: "40%", 
  transform: "translateY(-50%)",
  position: "absolute",
  width: "100%",
  height: "auto",
};

const DESIRED_FONT_SIZE = 120;
const HIGHLIGHT_COLOR = "#39E508";

export const Page: React.FC<{
  readonly enterProgress: number;
  readonly page: TikTokPage;
}> = ({ enterProgress, page }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  const fittedText = fitText({
    fontFamily,
    text: page.text,
    withinWidth: width * 0.9,
    textTransform: "uppercase",
  });

  const fontSize = Math.min(DESIRED_FONT_SIZE, fittedText.fontSize);

  return (
    <AbsoluteFill style={container}>
      <div
        style={{
          fontSize,
          color: "white",
          WebkitTextStroke: "1px black",
          paintOrder: "stroke",
          transform: makeTransform([
            scale(interpolate(enterProgress, [0, 1], [0.8, 1])),
            translateY(interpolate(enterProgress, [0, 1], [50, 0])),
          ]),
          fontFamily,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {page.tokens.length > 0 ? (
          page.tokens.map((t) => {
            const startRelativeToSequence = t.fromMs - page.startMs;
            const endRelativeToSequence = t.toMs - page.startMs;
            const isActive =
              startRelativeToSequence <= timeInMs &&
              endRelativeToSequence > timeInMs;

            return (
              <span
                key={`${t.text}-${t.fromMs}`}
                style={{
                  display: "inline",
                  whiteSpace: "pre",
                  color: isActive ? HIGHLIGHT_COLOR : "white",
                  marginRight: 6,
                  textShadow:
                    "2px 2px 0 black, -2px -2px 0 black, 2px -2px 0 black, -2px 2px 0 black",
                }}
              >
                {t.text + " "}
              </span>
            );
          })
        ) : (
          <span style={{ color: "gray" }}>(no tokens)</span>
        )}
      </div>
    </AbsoluteFill>
  );
};
