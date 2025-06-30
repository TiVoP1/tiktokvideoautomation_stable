'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Video, Download, CheckCircle, AlertCircle,
  Loader2, Clock
} from 'lucide-react';

import {
  QuizProject, QuizSettings, GenerationStatus
} from '@/types/quiz';
import { timingManager, calculateTotalDuration } from '@/lib/timing-manager';

type RenderSettings = Omit<QuizSettings, 'answerDuration' | 'extrasSeconds' | 'videoFormat'> & {
  videoFormat: '9:16';
};
type RenderProject = Omit<QuizProject, 'settings'> & { settings: RenderSettings; };

interface Props {
  quiz: QuizProject;
  onGenerate: () => void;
}

export function GenerationPanel({ quiz, onGenerate }: Props) {
  // 🔥 CRITICAL FIX: Use the EXACT same calculation as TimingSettings via global timing manager
  const [, forceUpdate] = useState({});
  
  // Subscribe to timing manager updates
  useEffect(() => {
    const unsubscribe = timingManager.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  // Get timing from global manager with detailed logging
  const globalExtrasTime = timingManager.getExtrasTime();
  const settingsExtrasTime = quiz.settings.extrasSeconds ?? 0;
  
  console.log('🔥 GenerationPanel timing comparison:', {
    globalExtrasTime,
    settingsExtrasTime,
    usingGlobal: globalExtrasTime > 0 ? globalExtrasTime : settingsExtrasTime,
    timestamp: new Date().toISOString()
  });

  // Use global timing manager value if available, otherwise fall back to settings
  const extrasToUse = globalExtrasTime > 0 ? globalExtrasTime : settingsExtrasTime;
  
  const duration = calculateTotalDuration(
    quiz.settings.questionDuration,
    quiz.settings.answerDuration,
    quiz.settings.resultDuration,
    quiz.questions.length,
    extrasToUse
  );

  const [status, setStatus] = useState<GenerationStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const canGenerate = quiz.questions.length > 0 &&
    quiz.questions.every(q => q.correctAnswer && q.fakeAnswers.length);

  const handleGenerate = async () => {
    console.log('🔥 GenerationPanel.handleGenerate: Starting generation with timing:', {
      duration,
      extrasToUse,
      globalExtrasTime,
      settingsExtrasTime
    });

    setStatus({ status: 'generating', progress: 0, message: 'Uploading media…' });

    const quizCopy: QuizProject = JSON.parse(JSON.stringify(quiz));

    for (const question of quizCopy.questions) {
      if (question.mediaUrl?.startsWith('blob:')) {
        try {
          const blob = await fetch(question.mediaUrl).then(r => r.blob());
          const ext = mimeToExtension(blob.type);
          const formData = new FormData();
          formData.append('file', blob, `media-${Date.now()}.${ext}`);

          const uploadRes = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: formData
          });

          const { url } = await uploadRes.json();
          question.mediaUrl = url;
        } catch (err) {
          console.error('Media upload failed:', err);
          setStatus({ status: 'error', progress: 0, message: 'Media upload failed' });
          return;
        }
      }
    }

    const fileFields = ['background', 'backgroundImage', 'backgroundMusic'];
    for (const key of fileFields) {
      const val = (quizCopy.settings as any)[key];
      if (typeof val === 'string' && val.startsWith('blob:')) {
        try {
          const blob = await fetch(val).then(r => r.blob());
          const ext = mimeToExtension(blob.type);
          const formData = new FormData();
          formData.append('file', blob, `${key}-${Date.now()}.${ext}`);

          const uploadRes = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: formData
          });

          const { url } = await uploadRes.json();
          (quizCopy.settings as any)[key] = url;
        } catch (err) {
          console.error(`${key} upload failed:`, err);
          setStatus({ status: 'error', progress: 0, message: `Upload failed: ${key}` });
          return;
        }
      }
    }

    const payload: RenderProject = {
      ...quizCopy,
      settings: {
        ...quizCopy.settings,
        videoFormat: '9:16'
      }
    };

    try {
      const res = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const { jobId } = await res.json();
      pollProgress(jobId);
    } catch (err) {
      console.error('❌ Generate error:', err);
      setStatus({ status: 'error', progress: 0, message: 'Generation failed' });
    }
  };

  const pollProgress = (jobId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3001/api/generate/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId })
        });

        const data: GenerationStatus = await res.json();
        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(pollingRef.current!);
          onGenerate();
        } else if (data.status === 'error') {
          clearInterval(pollingRef.current!);
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(pollingRef.current!);
        setStatus({ status: 'error', progress: 0, message: 'Polling failed' });
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="w-8 h-8 rounded-full flex items-center justify-center">5</Badge>
          <CardTitle className="text-xl">Video generation</CardTitle>
        </div>
        <CardDescription>
          Generate your final quiz video with all settings applied.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <SummaryGrid
          qCount={quiz.questions.length}
          theme={quiz.settings.theme}
          total={duration.formattedTime}
        />

        <TimingDetails 
          quiz={quiz} 
          duration={duration}
          extrasToUse={extrasToUse}
          globalExtrasTime={globalExtrasTime}
          settingsExtrasTime={settingsExtrasTime}
        />

        {status.status !== 'idle' && <StatusBar status={status} />}

        {!canGenerate && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Need at least one fully-edited question.
            </AlertDescription>
          </Alert>
        )}

        <ActionButtons
          disabledGenerate={!canGenerate || status.status === 'generating'}
          totalLabel={`(${duration.formattedTime})`}
          status={status}
          onGenerate={handleGenerate}
        />
      </CardContent>
    </Card>
  );
}

// UTILITIES + SUBCOMPONENTS

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    /* images */
    'image/png'  : 'png',
    'image/jpeg' : 'jpg',
    'image/webp' : 'webp',
    'image/gif'  : 'gif',
    /* audio */
    'audio/mpeg' : 'mp3',
    'audio/wav'  : 'wav',
    'audio/ogg'  : 'ogg',
    'audio/mp4'  : 'm4a',
    'audio/x-wav': 'wav',
    /* video  ⬇⬇⬇  */
    'video/mp4'        : 'mp4',
    'video/webm'       : 'webm',
    'video/quicktime'  : 'mov',
    'video/ogg'        : 'ogv',
    'video/x-matroska' : 'mkv'
  };
  return map[mime] || 'bin';
}


function SummaryGrid({ qCount, theme, total }: {
  qCount: number; theme: string; total: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SummaryBlock value={qCount} label="Questions" color="blue" />
      <SummaryBlock value="9:16" label="Format" color="green" />
      <SummaryBlock value={theme} label="Theme" color="purple" capitalize />
      <SummaryBlock value={total} label="Estimated total" color="orange" icon={<Clock className="w-5 h-5" />} />
    </div>
  );
}

function TimingDetails({ 
  quiz, 
  duration, 
  extrasToUse, 
  globalExtrasTime, 
  settingsExtrasTime 
}: {
  quiz: QuizProject; 
  duration: ReturnType<typeof calculateTotalDuration>;
  extrasToUse: number;
  globalExtrasTime: number;
  settingsExtrasTime: number;
}) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" /> Timing details
      </h4>
      <BreakdownRow label="Question:" value={`${quiz.settings.questionDuration}s`} />
      <BreakdownRow label="Answer window:" value={`${quiz.settings.answerDuration}s`} />
      <BreakdownRow label="Result:" value={`${quiz.settings.resultDuration}s`} />
      <BreakdownRow label="Extras:" value={`${extrasToUse}s`} />
      <div className="mt-3 pt-3 border-t border-muted-foreground/20 space-y-1">
        <BreakdownRow label="Estimated total:" value={duration.formattedTime} bold />
      </div>
      
      {/* Debug info */}
      <div className="mt-3 pt-2 border-t border-muted-foreground/10 text-xs text-muted-foreground">
        <div>Global: {globalExtrasTime}s | Settings: {settingsExtrasTime}s | Using: {extrasToUse}s</div>
        <div>Base: {duration.baseSeconds}s + Extras: {duration.extrasSeconds}s = Total: {duration.totalSeconds}s</div>
      </div>
    </div>
  );
}

function ActionButtons({
  disabledGenerate, totalLabel, status, onGenerate
}: {
  disabledGenerate: boolean; totalLabel: string; 
  status: GenerationStatus; onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button className="flex-1 bg-gradient-to-r
                         from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
        size="lg"
        disabled={disabledGenerate}
        onClick={onGenerate}>
        {status.status === 'generating'
          ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {status.message || 'Rendering…'}</>)
          : (<><Video className="w-4 h-4 mr-2" /> Generate {totalLabel}</>)
        }
      </Button>

      {status.status === 'completed' && status.videoUrl && (
        <Button variant="outline" className="flex-1" asChild>
          <a href={status.videoUrl} download>
            <Download className="w-4 h-4 mr-2" /> Download video
          </a>
        </Button>
      )}
    </div>
  );
}

function SummaryBlock({
  value, label, color, icon, capitalize = false
}: {
  value: string | number; label: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo';
  icon?: React.ReactNode; capitalize?: boolean;
}) {
  const cls = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    green: 'from-green-50 to-green-100 border-green-200 text-green-600',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-600',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-600',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600'
  }[color];
  const txt = capitalize ? String(value).replace(/^./, c => c.toUpperCase()) : value;
  return (
    <div className={`text-center p-3 bg-gradient-to-br ${cls} rounded-lg border`}>
      <div className="text-2xl font-bold flex items-center justify-center gap-1">
        {icon}{txt}
      </div>
      <div className="text-sm">{label}</div>
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

function StatusBar({ status }: { status: GenerationStatus }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {status.status === 'generating' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
        {status.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
        <span className="text-sm font-medium">{status.message}</span>
      </div>
      <Progress value={status.progress} />
    </div>
  );
}