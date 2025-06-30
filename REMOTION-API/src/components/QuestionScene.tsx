import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion';

type QuestionSceneProps = {
  imageUrl: string;
  options: Record<string, string>; // klucze dowolne, np. opt1, opt2, ...
  correctOption: string;           // klucz pasujący do options
  durationInFrames: number;
  preAnimationDuration: number;    // Duration of pre-animation phase
  revealAnimationDuration: number; // Duration of reveal animation phase
  textColor: string;
  labelStyle?: 'abc' | '123';      // styl labeli
};

export const QuestionScene = ({
  imageUrl,
  options,
  correctOption,
  durationInFrames,
  preAnimationDuration,
  revealAnimationDuration,
  textColor,
  labelStyle = 'abc',
}: QuestionSceneProps) => {
  const frame = useCurrentFrame();
  const optionEntries = Object.entries(options);
  
  // Phase calculations
  const questionPhaseStart = preAnimationDuration;
  const questionPhaseEnd = preAnimationDuration + durationInFrames;
  const revealPhaseStart = questionPhaseEnd;
  const totalDuration = preAnimationDuration + durationInFrames + revealAnimationDuration;

  // Pre-animation phase (0 to preAnimationDuration)
  const preAnimationProgress = interpolate(
    frame,
    [0, preAnimationDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Main container animation during pre-phase
  const containerOpacity = interpolate(
    frame,
    [0, preAnimationDuration * 0.6],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const containerScale = interpolate(
    frame,
    [0, preAnimationDuration],
    [0.95, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Image entrance animation
  const imageScale = interpolate(
    frame,
    [preAnimationDuration * 0.2, preAnimationDuration * 0.8],
    [0.8, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const imageOpacity = interpolate(
    frame,
    [preAnimationDuration * 0.1, preAnimationDuration * 0.6],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Progress bar animation (only during question phase)
  const progressBarOpacity = interpolate(
    frame,
    [questionPhaseStart - 5, questionPhaseStart + 5],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const progressWidth = interpolate(
    frame,
    [questionPhaseStart, questionPhaseEnd],
    [0, 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Reveal phase animations
  const isInRevealPhase = frame >= revealPhaseStart;
  const revealProgress = interpolate(
    frame,
    [revealPhaseStart, revealPhaseStart + revealAnimationDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        color: textColor,
        gap: '20px',
        padding: '24px 20px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
      }}
    >
      {/* Image */}
      <div
        style={{
          width: '100%',
          maxWidth: '85%',
          aspectRatio: '16/9',
          borderRadius: '28px',
          overflow: 'hidden',
          border: '4px solid rgba(255,255,255,0.15)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
          transform: `scale(${imageScale})`,
          opacity: imageOpacity,
          position: 'relative',
        }}
      >
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        {/* Gradient overlay for better text contrast */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Options */}
      <div
        style={{
          width: '100%',
          maxWidth: '85%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '12px',
          marginTop: '8px',
        }}
      >
        {optionEntries.map(([key, text], index) => {
          const label =
            labelStyle === '123'
              ? `${index + 1}`
              : String.fromCharCode(65 + index); // 65 === A

          const isCorrect = key === correctOption;
          const isHighlighted = isInRevealPhase && isCorrect;

          // Staggered animation for options during pre-phase
          const optionDelay = preAnimationDuration * 0.4 + index * (preAnimationDuration * 0.1);
          const optionOpacity = interpolate(
            frame,
            [optionDelay, optionDelay + preAnimationDuration * 0.3],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          const optionTranslateY = interpolate(
            frame,
            [optionDelay, optionDelay + preAnimationDuration * 0.3],
            [20, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          // Pulse animation for correct answer during reveal
          const pulseScale = isHighlighted 
            ? interpolate(
                frame,
                [revealPhaseStart, revealPhaseStart + 15, revealPhaseStart + 30],
                [1, 1.05, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )
            : 1;

          // Highlight animation
          const highlightIntensity = isHighlighted
            ? interpolate(
                frame,
                [revealPhaseStart, revealPhaseStart + revealAnimationDuration * 0.5],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )
            : 0;

          return (
            <div
              key={key}
              style={{
                padding: '18px 28px',
                borderRadius: '20px',
                backgroundColor: isHighlighted
                  ? `rgba(16, 185, 129, ${0.8 * highlightIntensity})`
                  : 'rgba(255,255,255,0.08)',
                background: isHighlighted
                  ? `linear-gradient(135deg, rgba(16, 185, 129, ${highlightIntensity}) 0%, rgba(5, 150, 105, ${highlightIntensity}) 100%)`
                  : 'rgba(255,255,255,0.08)',
                color: isHighlighted ? '#ffffff' : textColor,
                fontSize: '17px',
                fontWeight: isHighlighted ? 700 : 600,
                letterSpacing: '0.3px',
                textAlign: 'left',
                lineHeight: 1.3,
                border: isHighlighted 
                  ? `3px solid rgba(16, 185, 129, ${0.6 * highlightIntensity})`
                  : '2px solid rgba(255,255,255,0.15)',
                boxShadow: isHighlighted
                  ? `0 0 ${30 * highlightIntensity}px rgba(16, 185, 129, ${0.4 * highlightIntensity}), 0 8px 25px rgba(0,0,0,0.3)`
                  : '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                userSelect: 'none',
                width: '100%',
                backdropFilter: 'blur(10px)',
                opacity: optionOpacity,
                transform: `translateY(${optionTranslateY}px) scale(${pulseScale})`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Shimmer effect for highlighted answer */}
              {isHighlighted && highlightIntensity > 0.5 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${-100 + (frame - revealPhaseStart) * 3}%`,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  }}
                />
              )}
              
              {/* Label circle */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isHighlighted 
                    ? `rgba(255,255,255,${0.25 * highlightIntensity})` 
                    : 'rgba(255,255,255,0.15)',
                  fontSize: '14px',
                  fontWeight: 700,
                  marginRight: '16px',
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              
              <span style={{ position: 'relative', zIndex: 1 }}>
                {text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar - only visible during question phase */}
      <div
        style={{
          width: '100%',
          maxWidth: '85%',
          height: '8px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: '999px',
          overflow: 'hidden',
          marginTop: '24px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: progressBarOpacity,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressWidth}%`,
            background: 'linear-gradient(90deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)',
            borderRadius: '999px',
            boxShadow: '0 0 10px rgba(255, 107, 107, 0.5)',
            position: 'relative',
          }}
        >
          {/* Animated glow effect */}
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-4px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
              filter: 'blur(1px)',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};