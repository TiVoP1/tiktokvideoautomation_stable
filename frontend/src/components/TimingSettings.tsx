'use client';

import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Label }   from '@/components/ui/label';
import { Slider }  from '@/components/ui/slider';
import { Badge }   from '@/components/ui/badge';
import { Input }   from '@/components/ui/input';
import { Button }  from '@/components/ui/button';
import {
  Clock, Timer, Sparkles, Trash2, Loader2
} from 'lucide-react';

import { QuizSettings } from '@/types/quiz';
import { timingManager, calculateTotalDuration } from '@/lib/timing-manager';

/* ─────────── constants ─────────── */
const ANSWER_TIME = 1;
const DEFAULT_Q   = 4;
const DEFAULT_R   = 1;

/* ─────────── types ─────────── */
interface CutIn { after_question: number; text: string }

interface TimingSettingsProps {
  settings: QuizSettings;
  topic?: string;
  questionCount?: number;
  onSettingsChange: (u: Partial<QuizSettings>) => void;
}

/* ─────────── component ─────────── */
export function TimingSettings({
  settings, topic, questionCount = 5, onSettingsChange
}: TimingSettingsProps) {

  /* topic fallbacks */
  const resolvedTopic =
    topic?.trim() ||
    (typeof window !== 'undefined'
      ? (window as any).topic?.value?.trim()
      : undefined) ||
    (typeof window !== 'undefined'
      ? (window as any).QuizAnswers?.[0]?.topic
      : undefined) ||
    'General Knowledge';

  /* ---------- local state ---------- (start from settings.extras) */
  const [extras, setExtras] = useState(() => ({
    intro : settings.extras?.intro  ?? '',
    outro : settings.extras?.outro  ?? '',
    cta   : settings.extras?.cta    ?? ''
  }));
  const [ctaEnabled, setCtaEnabled] = useState(!!settings.extras?.cta);
  const [ctaAt,       setCtaAt]     = useState(settings.extras?.ctaAfter ?? 1);
  const [cutins,      setCutins]    = useState<CutIn[]>(settings.extras?.cutins ?? []);
  const [aiLoading,   setAiLoading] = useState(false);

  // Force re-render when timing manager updates
  const [, forceUpdate] = useState({});

  /* default times - only once */
  useEffect(() => {
    const upd: Partial<QuizSettings> = {};
    if (settings.questionDuration == null) upd.questionDuration = DEFAULT_Q;
    if (settings.resultDuration   == null) upd.resultDuration   = DEFAULT_R;
    if (settings.answerDuration   == null) upd.answerDuration   = ANSWER_TIME;
    if (Object.keys(upd).length) onSettingsChange(upd);
  }, []);

  /* ---------- helpers ---------- */
  const est = (t:string) => Math.min(8, Math.max(1, +(t.length / 30).toFixed(1)));

  // 🔥 CRITICAL: Calculate total extras time
  const totalExtraSeconds =
        est(extras.intro) +
        est(extras.outro) +
        (ctaEnabled ? est(extras.cta) : 0) +
        cutins.reduce((s,c)=>s+est(c.text),0);

  /* ---------- SYNC ⇄ settings AND GLOBAL TIMING MANAGER ---------- */
  useEffect(() => {
    console.log('🔥 TimingSettings: Updating global timing manager', {
      totalExtraSeconds,
      extras,
      ctaEnabled,
      cutins: cutins.length
    });

    /* 1) Update global timing manager */
    timingManager.setExtrasTime(totalExtraSeconds);

    /* 2) answerDuration & extrasSeconds */
    if (settings.answerDuration !== ANSWER_TIME)
      onSettingsChange({ answerDuration: ANSWER_TIME });
    
    // Always update extrasSeconds when it changes
    onSettingsChange({ extrasSeconds: totalExtraSeconds });

    /* 3) full extras object */
    onSettingsChange({
      extras: {
        intro   : extras.intro,
        outro   : extras.outro,
        cta     : ctaEnabled ? extras.cta : '',
        ctaAfter: ctaEnabled ? ctaAt : 0,
        cutins  : cutins
      }
    });
  }, [extras, ctaEnabled, ctaAt, cutins, totalExtraSeconds]);

  // Subscribe to timing manager updates
  useEffect(() => {
    const unsubscribe = timingManager.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  /* ---------- time calc with ENHANCED LOGGING ---------- */
  const pureQuestion =
      (settings.questionDuration ?? DEFAULT_Q) +
      ANSWER_TIME +
      (settings.resultDuration   ?? DEFAULT_R);
  
  // 🔥 CRITICAL FIX: Use the new timing manager calculation
  const duration = calculateTotalDuration(
    settings.questionDuration ?? DEFAULT_Q,
    settings.answerDuration ?? ANSWER_TIME,
    settings.resultDuration ?? DEFAULT_R,
    questionCount,
    totalExtraSeconds
  );

  /* ---------- helpers: cut-ins ---------- */
  const freeSlots = () => {
    const used = new Set<number>([
      ...(ctaEnabled ? [ctaAt] : []),
      ...cutins.map(c=>c.after_question)
    ]);
    return [...Array(questionCount-1).keys()].map(i=>i+1).filter(n=>!used.has(n));
  };

  const updateCutin = (idx:number, field:keyof CutIn, val:number|string) => {
    const list = [...cutins];
    const prev = list[idx].after_question;
    list[idx] = { ...list[idx], [field]: val };

    if (field === 'after_question') {
      const other = list.findIndex((c,i)=>c.after_question===val && i!==idx);
      if (other !== -1) list[other].after_question = prev;                  // swap
      else if (new Set(list.map(c=>c.after_question)).size !== list.length){
        const free = freeSlots();
        if (free.length) list[idx].after_question = free[0];
        else list.splice(idx,1);                                            // no space
      }
    }
    setCutins(list);
  };

  /* ---------- AI timing ---------- */
  const handleGenerateAI = async () => {
    setAiLoading(true);

    const payload = {
      topic         : resolvedTopic,
      questionCount,
      answerDuration: settings.questionDuration ?? ANSWER_TIME,
      current: {
        questionDuration: settings.questionDuration ?? DEFAULT_Q,
        resultDuration  : settings.resultDuration   ?? DEFAULT_R,
        extrasSeconds   : totalExtraSeconds,
        extras, cutins, ctaEnabled, ctaAt
      }
    };

    try {
      const res = await fetch('http://localhost:3001/api/timing', {
        method :'POST',
        headers:{ 'Content-Type':'application/json' },
        body   : JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setExtras({ intro:data.intro ?? '', outro:data.outro ?? '', cta:data.cta ?? '' });
      setCtaEnabled(!!data.cta);
      setCtaAt(data.ctaAfter ?? 1);
      setCutins(data.cutins ?? []);
    } catch (err) {
      console.error('AI timing error', err);
      alert(`Timing API error: ${err}`);
    } finally { setAiLoading(false); }
  };

  // Debug logging
  useEffect(() => {
    timingManager.debug();
  }, [totalExtraSeconds]);

  /* ---------------- UI ---------------- */
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="w-8 h-8 rounded-full flex items-center justify-center">
            4
          </Badge>
          <CardTitle className="text-xl">Timing & Duration</CardTitle>
        </div>
        <CardDescription>
          Intro, outro, CTA & cut-ins plus question and result screen timing.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* CONTROLS */}
        <div className="grid gap-6">
          <TimeSlider label="Question Time"
            value={settings.questionDuration ?? DEFAULT_Q}
            onChange={v=>onSettingsChange({questionDuration:v})}/>
          <TimeSlider label="Result Display"
            value={settings.resultDuration ?? DEFAULT_R}
            onChange={v=>onSettingsChange({resultDuration:v})}/>

          {(['intro','outro','cta'] as const).map(k=>(
            <TextInput key={k}
              label={`${k[0].toUpperCase()+k.slice(1)} Text`}
              value={(extras as any)[k]}
              estimate={est((extras as any)[k])}
              onChange={txt=>setExtras({...extras,[k]:txt})}/>
          ))}

          {/* CTA */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input type="checkbox" checked={ctaEnabled}
                     onChange={e=>setCtaEnabled(e.target.checked)}/> Enable CTA
            </Label>
            {ctaEnabled && (
              <>
                <Label>CTA After Question</Label>
                <Slider value={[ctaAt]}
                        onValueChange={v=>setCtaAt(v[0])}
                        max={questionCount-1} min={1} step={1}/>
              </>
            )}
          </div>

          {/* CUT-INS */}
          <div className="space-y-2">
            <Label>Cut-ins</Label>
            <div className="space-y-3">
              {cutins.map((c,i)=>(
                <CutinEditor key={i} cutin={c}
                  maxQuestion={questionCount-1}
                  estimate={est(c.text)}
                  onChange={(f,v)=>updateCutin(i,f,v)}
                  onRemove={()=>setCutins(cutins.filter((_,idx)=>idx!==i))}/>
              ))}
              {cutins.length < questionCount - (ctaEnabled?2:1) && (
                <Button variant="outline" size="sm"
                        onClick={()=>setCutins([...cutins,
                          {after_question:freeSlots()[0],text:''}])}>
                  + Add Cut-in
                </Button>
              )}
            </div>
          </div>

          {/* AI helper */}
          <Button onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="mt-2 bg-violet-600 hover:bg-violet-700 text-white">
            {aiLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
            <Sparkles className="w-4 h-4 mr-2"/> Generate with AI
          </Button>
        </div>

        {/* Timing Summary with DETAILED BREAKDOWN */}
        <div className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border">
          <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4" />
            Timing Summary
          </h4>
          <div className="space-y-2 text-sm">
            <BreakdownRow label="Per question:" value={`${pureQuestion}s`} />
            <BreakdownRow label="Base total:" value={`${duration.baseSeconds}s`} />
            <BreakdownRow label="Extras time:" value={`${duration.extrasSeconds}s`} />
            <div className="pt-2 border-t border-muted-foreground/20">
              <BreakdownRow label="Estimated total:" value={duration.formattedTime} bold />
            </div>
          </div>
          
          {/* Debug info */}
          <div className="mt-3 pt-2 border-t border-muted-foreground/10 text-xs text-muted-foreground">
            Global extras: {timingManager.getExtrasTime()}s | Local extras: {totalExtraSeconds}s
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-2 gap-4">
          <SummaryCard icon={<Timer className="w-4 h-4 text-blue-600"/>}
            title="Per-question duration"
            value={`${pureQuestion}s`}
            subtitle={`${settings.questionDuration??DEFAULT_Q}s + ${ANSWER_TIME}s + ${settings.resultDuration??DEFAULT_R}s`}
            gradient="from-blue-50 to-indigo-50 border-blue-200 text-blue-700"/>
          <SummaryCard icon={<Clock className="w-4 h-4 text-green-600"/>}
            title="Estimated total"
            value={duration.formattedTime}
            subtitle={`Base (${duration.baseSeconds}s) + Extras (${duration.extrasSeconds}s)`}
            gradient="from-green-50 to-emerald-50 border-green-200 text-green-700"/>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── mini-components ─────────── */
function TimeSlider({label,value,onChange,min=0.5,max=8,step=0.5}:{
  label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number;
}){
  return(
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2"><Clock className="w-4 h-4"/> {label}</Label>
        <Badge variant="secondary">{value}s</Badge>
      </div>
      <Slider value={[value]} onValueChange={v=>onChange(v[0])}
              min={min} max={max} step={step}/>
    </div>
  );
}

function TextInput({label,value,onChange,estimate}:{
  label:string;value:string;onChange:(s:string)=>void;estimate:number;
}){
  return(
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={e=>onChange(e.target.value)}
             placeholder={`Enter ${label.toLowerCase()}…`}
             className="text-foreground bg-background"/>
      <div className="text-xs text-muted-foreground italic">Estimated: ~{estimate}s</div>
    </div>
  );
}

function CutinEditor({cutin,maxQuestion,estimate,onChange,onRemove}:{
  cutin:CutIn;maxQuestion:number;estimate:number;
  onChange:(f:'after_question'|'text',v:number|string)=>void;
  onRemove:()=>void;
}){
  return(
    <div className="border rounded-md p-3 space-y-2">
      <Label className="text-xs">After Question: {cutin.after_question}</Label>
      <Slider value={[cutin.after_question]}
              onValueChange={v=>onChange('after_question',v[0])}
              max={maxQuestion} min={1} step={1}/>
      <Input value={cutin.text} onChange={e=>onChange('text',e.target.value)}
             className="text-foreground bg-background"/>
      <div className="text-xs text-muted-foreground italic">Estimated: ~{estimate}s</div>
      <Button size="icon" variant="ghost" onClick={onRemove}>
        <Trash2 className="w-4 h-4"/>
      </Button>
    </div>
  );
}

function SummaryCard({icon,title,value,subtitle,gradient}:{
  icon:React.ReactNode;title:string;value:string;subtitle:string;gradient:string;
}){
  return(
    <div className={`p-4 bg-gradient-to-br ${gradient} rounded-lg border`}>
      <div className="flex items-center gap-2 mb-2">{icon}<h4 className="font-medium">{title}</h4></div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm">{subtitle}</div>
    </div>
  );
}

function BreakdownRow({ label, value, bold = false }: {
  label: string; value: string; bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-bold text-lg' : 'font-medium'}>{value}</span>
    </div>
  );
}