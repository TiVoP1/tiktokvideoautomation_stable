import { Composition } from "remotion";
import { MainComposition } from "./MainComposition";
import { getTotalDurationFromData } from "./utils/getTotalDuration";
import { useEffect, useState } from "react";
import { loadFont } from "./components/load-font";

const fps = 30;
const width = 720;
const height = 1280;
const jsonUrl = "http://localhost:4000/json";

export const RemotionRoot: React.FC = () => {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    loadFont();

    console.log("📥 Loading JSON from:", jsonUrl);

    fetch(jsonUrl)
      .then((res) => res.json())
      .then((json) => {
        console.log("✅ Loaded JSON:", json);
        setData(json);
      })
      .catch((err) => {
        console.error("❌ Failed to load JSON:", err);
      });
  }, []);

  if (!data) {
    console.log("⏳ Waiting for JSON...");
    return null;
  }

  const durationInFrames = getTotalDurationFromData(data, fps);
  if (!Number.isFinite(durationInFrames)) {
    console.error("❌ Invalid durationInFrames:", durationInFrames);
    return null;
  }

  return (
    <Composition
      id="Main"
      component={MainComposition}
      durationInFrames={durationInFrames}
      fps={fps}
      width={width}
      height={height}
      defaultProps={{ data }}
    />
  );
};
