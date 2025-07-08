// Background.tsx
import React from 'react';
import {AbsoluteFill, Video, useVideoConfig} from 'remotion';

export const Background = ({
  url,
  fallbackStyle,
  offset = 0,             // ← sekunda startu (background_offset)
}: {
  url?: string;
  fallbackStyle: React.CSSProperties;
  offset?: number;
}) => {
  /* fps kompozycji – potrzebny do startFrom */
  const {fps} = useVideoConfig();

  /* proste rozpoznanie po rozszerzeniu; w razie potrzeby
     dodaj tu kolejne formaty */
  const isVideo = url
    ? /\.(mp4|mov|webm|mkv|ogv)$/i.test(url.split('?')[0] ?? '')
    : false;

  /* ══════════════════════ VIDEO ══════════════════════ */
  if (url && isVideo) {
    const startFrame = Math.round((offset ?? 0) * fps);

    return (
      <AbsoluteFill style={{zIndex: 0, overflow: 'hidden'}}>
        <Video
          src={url}
          startFrom={startFrame}     // ⬅️ Remotion 3.x+
          muted
          loop
          playbackRate={1}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.9)',
          }}
        />
      </AbsoluteFill>
    );
  }

  /* ══════════════════════ OBRAZEK ══════════════════════ */
  if (url) {
    return (
      <AbsoluteFill
        style={{
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.9)',
          zIndex: 0,
        }}
      />
    );
  }

  /* ══════════════════════ Fallback (brak URL) ═══════════ */
  return (
    <AbsoluteFill
      style={{
        ...fallbackStyle,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
      }}
    />
  );
};
