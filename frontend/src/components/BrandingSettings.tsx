'use client';

/**
 * Branding & Style – unified background media (image -or- video) + offsets (bez przycinania)
 * ------------------------------------------------------------------------------------------
 * • Jeden uploader / URL dla tła – akceptuje obraz albo wideo.
 * • Kiedy to wideo → slider „Start at mm:ss”, zapisywany w bgVideoStartOffset.
 *   ⤷ Podgląd ustawia video.currentTime; nic nie tniemy.
 * • Audio: slider „Start at”, tylko zapis musicStartOffset; podgląd skacze przy play.
 * • Overlay (correct answer) ma z-index 10, <video> z-index 0 → nic się nie chowa.
 * • <video> ma object-cover i wypełnia 9×16.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Smartphone, Eye, Trash2, Music4, Palette
} from 'lucide-react';

import { QuizSettings, QuizQuestion } from '@/types/quiz';
import { getAnswerLabel } from '@/lib/quiz-utils';

/* ---------- helpers ---------- */
const fmt = (sec: number) =>
  `${Math.floor(sec / 60)}:${Math.floor(sec % 60)
    .toString()
    .padStart(2, '0')}`;

/* ---------- props ---------- */
interface BrandingSettingsProps {
  settings: QuizSettings & {
    musicStartOffset?: number;
    bgVideoStartOffset?: number;
  };
  question?: QuizQuestion;
  onSettingsChange: (
    p: Partial<
      QuizSettings & { musicStartOffset?: number; bgVideoStartOffset?: number }
    >
  ) => void;
}

export function BrandingSettings({
  settings,
  question,
  onSettingsChange,
}: BrandingSettingsProps) {
  /* ---------- background media (image / video) ---------- */
  const [bg, setBg] = useState<{
    url: string;
    type: 'image' | 'video';
    file?: File;
  } | null>(
    settings.backgroundImage
      ? {
          url: settings.backgroundImage,
          type: /\.(mp4|mov|webm)$/i.test(settings.backgroundImage)
            ? 'video'
            : 'image',
        }
      : null
  );
  const [vidOff, setVidOff] = useState(settings.bgVideoStartOffset || 0);
  const [vidDur, setVidDur] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ---------- audio ---------- */
  const [music, setMusic] = useState(settings.backgroundMusic || '');
  const [musOff, setMusOff] = useState(settings.musicStartOffset || 0);
  const [musDur, setMusDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* ---------- watermark ---------- */
  const [brand, setBrand] = useState(settings.brandingText || '');

  /* ---------- first question for preview ---------- */
  const [firstQ, setFirstQ] = useState<QuizQuestion | undefined>(question);
  useEffect(() => {
    const id = setInterval(() => {
      const qa = (window as any).QuizAnswers;
      if (Array.isArray(qa) && qa.length) setFirstQ(qa[0]);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- media metadata ---------- */
  useEffect(() => {
    if (bg?.type === 'video') {
      const v = document.createElement('video');
      v.src = bg.url;
      v.onloadedmetadata = () => setVidDur(v.duration || 0);
    } else setVidDur(0);
  }, [bg]);

  useEffect(() => {
    if (!music) {
      setMusDur(0);
      return;
    }
    const a = new Audio();
    a.src = music;
    a.onloadedmetadata = () => setMusDur(a.duration || 0);
  }, [music]);

  /* ---------- offsets -> preview jump ---------- */
  useEffect(() => {
    if (videoRef.current && bg?.type === 'video')
      videoRef.current.currentTime = vidOff;
  }, [vidOff, bg]);

  const handleVidPlay = () => {
    if (videoRef.current) videoRef.current.currentTime = vidOff;
  };
  const handleMusPlay = () => {
    if (audioRef.current && audioRef.current.currentTime < musOff)
      audioRef.current.currentTime = musOff;
  };

  /* ---------- handlers ---------- */
  const pickBg = (f: File) => {
    const url = URL.createObjectURL(f);
    const t = f.type.startsWith('video') ? 'video' : 'image';
    setBg({ url, type: t, file: f });
    setVidOff(0);
    onSettingsChange({ backgroundImage: url, bgVideoStartOffset: 0 });
  };
  const setBgLink = (u: string) => {
    if (!u) {
      setBg(null);
      onSettingsChange({
        backgroundImage: undefined,
        bgVideoStartOffset: undefined,
      });
      return;
    }
    const t = /\.(mp4|mov|webm)$/i.test(u) ? 'video' : 'image';
    setBg({ url: u, type: t });
    setVidOff(0);
    onSettingsChange({ backgroundImage: u.trim(), bgVideoStartOffset: 0 });
  };
  const rmBg = () => {
    setBg(null);
    onSettingsChange({ backgroundImage: undefined, bgVideoStartOffset: undefined });
  };

  const pickMus = (f: File) => {
    const url = URL.createObjectURL(f);
    setMusic(url);
    onSettingsChange({ backgroundMusic: url });
  };
  const setMusLink = (u: string) => {
    setMusic(u.trim());
    onSettingsChange({ backgroundMusic: u.trim() || undefined });
  };
  const rmMus = () => {
    setMusic('');
    onSettingsChange({ backgroundMusic: undefined });
  };

  /* ---------- themes ---------- */
  const themes = [
    { v: 'modern', l: 'Modern', bg: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#667eea 100%)', t: '#fff' },
    { v: 'dark', l: 'Dark', bg: 'linear-gradient(135deg,#0f0f23 0%,#1a1a2e 50%,#16213e 100%)', t: '#fff' },
    { v: 'retro', l: 'Retro', bg: 'linear-gradient(135deg,#ff9a9e 0%,#fecfef 25%,#fecfef 75%,#ff9a9e 100%)', t: '#1f2937' },
    { v: 'corporate', l: 'Corporate', bg: 'linear-gradient(135deg,#1e3c72 0%,#2a5298 50%,#1e3c72 100%)', t: '#fff' },
  ];
  const theme = useMemo(
    () => themes.find((t) => t.v === settings.theme) || themes[0],
    [settings.theme]
  );

  const ordered = useMemo(() => {
    if (!firstQ) return [];
    const arr = [...firstQ.fakeAnswers];
    arr.splice(firstQ.correctPosition - 1, 0, firstQ.correctAnswer);
    return arr;
  }, [firstQ]);

  /* ---------- render ---------- */
  return (
    <Card>
      <CardHeader className="pb-4 flex items-start gap-2">
        <Badge variant="default" className="w-8 h-8">
          3
        </Badge>
        <div>
          <CardTitle className="text-xl">Branding &amp; Style</CardTitle>
          <CardDescription>Background media + start offsets</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* LEFT */}
          <div className="space-y-6">
            <Section label="Background media" icon={<Upload className="w-4 h-4" />}>
              <Input
                value={bg?.url || ''}
                placeholder="Paste image or video URL…"
                onChange={(e) => setBgLink(e.target.value)}
              />
              <Uploader
                accept="image/*,video/*"
                current={bg?.url || ''}
                previewType={bg?.type === 'video' ? 'video' : undefined}
                onPick={pickBg}
                onRemove={rmBg}
              />
              {bg?.type === 'video' && vidDur > 0 && (
                <Slider
                  val={vidOff}
                  max={vidDur}
                  onChange={(v) => {
                    setVidOff(v);
                    onSettingsChange({ bgVideoStartOffset: v });
                  }}
                />
              )}
            </Section>

            <Section label="Theme" icon={<Palette className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.v}
                    onClick={() => onSettingsChange({ theme: t.v as any })}
                    className={`p-2 rounded-md border ${
                      t.v === settings.theme ? 'border-primary' : 'border-muted'
                    }`}
                    style={{ background: t.bg, color: t.t }}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Music" icon={<Music4 className="w-4 h-4" />}>
              <Input
                value={music}
                placeholder="Paste audio URL…"
                onChange={(e) => setMusLink(e.target.value)}
              />
              <Uploader
                accept="audio/*"
                current={music}
                previewType="audio"
                onPick={pickMus}
                onRemove={rmMus}
              />
              {music && musDur > 0 && (
                <Slider
                  val={musOff}
                  max={musDur}
                  onChange={(v) => {
                    setMusOff(v);
                    onSettingsChange({ musicStartOffset: v });
                  }}
                />
              )}
            </Section>

            <Section label="Watermark">
              <Input
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  onSettingsChange({ brandingText: e.target.value });
                }}
              />
            </Section>
          </div>

          {/* RIGHT – preview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <Label className="font-semibold">Preview</Label>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Smartphone className="w-4 h-4" />
                9:16
              </Badge>
            </div>

            <div className="relative">
              <div
                className="aspect-[9/16] max-w-xs mx-auto rounded-xl overflow-hidden shadow-xl border relative flex flex-col items-center justify-start p-4 pt-6"
                style={{
                  background: bg?.type === 'image'
                    ? `url(${bg.url}) center/cover no-repeat`
                    : bg
                    ? 'transparent'
                    : theme.bg,
                  color: theme.t,
                }}
              >
                {bg?.type === 'video' && (
                  <video
                    ref={videoRef}
                    src={bg.url}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onPlay={handleVidPlay}
                  />
                )}

                <div className="relative z-10 w-full">
                  <span className="absolute -top-5 left-0 text-xs bg-black/40 text-white px-2 py-1 rounded">
                    {theme.l}
                  </span>

                  {firstQ?.mediaUrl && (
                    <img
                      src={firstQ.mediaUrl}
                      className="w-full aspect-video object-cover rounded mb-3"
                    />
                  )}

                  {firstQ && (
                    <div className="w-full space-y-2">
                      {ordered.map((ans, i) => {
                        const ok = i + 1 === firstQ.correctPosition;
                        return (
                          <div
                            key={i}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${
                              ok
                                ? 'bg-green-500 text-white'
                                : 'bg-white/40 backdrop-blur'
                            }`}
                          >
                            {getAnswerLabel(i, settings.labelStyle)}. {ans}
                            {ok && ' ✅'}
                          </div>
                        );
                      })}
                      {brand && (
                        <p className="text-center mt-4 text-white/80 font-semibold">
                          {brand}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* ukryty audio element – tylko do skip-intro preview */}
      {music && (
        <audio
          ref={audioRef}
          src={music}
          onPlay={handleMusPlay}
          className="hidden"
        />
      )}
    </Card>
  );
}

/* ---------- helper components ---------- */
function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

function Uploader({
  accept,
  current,
  onPick,
  previewType,
  onRemove,
}: {
  accept: string;
  current: string;
  onPick: (f: File) => void;
  previewType?: 'video' | 'audio';
  onRemove: () => void;
}) {
  return (
    <div className="relative border-2 border-dashed rounded-lg p-4 text-center">
      {current ? (
        <>
          {previewType === 'video' ? (
            <video
              src={current}
              className="mx-auto h-24 object-cover"
              muted
              loop
            />
          ) : previewType === 'audio' ? (
            <audio src={current} controls className="w-full" />
          ) : (
            <img src={current} className="mx-auto h-24 object-cover" />
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </>
      ) : (
        <>
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Upload file</p>
        </>
      )}

      <input
        type="file"
        accept={accept}
        className="hidden"
        id={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />

      {!current && (
        <label htmlFor={accept} className="absolute inset-0 cursor-pointer" />
      )}
    </div>
  );
}

function Slider({
  val,
  max,
  onChange,
}: {
  val: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        💫 Start at {fmt(val)} / {fmt(max)}
      </Label>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={val}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
