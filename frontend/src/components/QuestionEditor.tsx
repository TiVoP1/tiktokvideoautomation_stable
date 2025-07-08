'use client';
import { backendUrl } from './backend';
import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Sparkles, Upload, Loader2, Play, Pause, Square } from 'lucide-react';
import { QuizQuestion } from '@/types/quiz';
import { getAnswerLabel, shuffleAnswers } from '@/lib/quiz-utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';


function browserSupportsType(mime: string): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL(mime).indexOf(`data:${mime}`) === 0;
  } catch (_) {
    return false;
  }
}


async function convertImageToPng(url: string): Promise<string> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;

    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[media-convert] failed to convert', url, err);
    return url; // graceful degradation
  }
}

interface EnhancedQuestion extends QuizQuestion {
  wasEnhanced?: boolean;
}

interface QuestionEditorProps {
  questions: EnhancedQuestion[];
  labelStyle: 'abc' | '123';
  onQuestionsChange: (questions: EnhancedQuestion[]) => void;
  onLabelStyleChange: (style: 'abc' | '123') => void;
}

export function QuestionEditor({
  questions, labelStyle, onQuestionsChange, onLabelStyleChange
}: QuestionEditorProps) {
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  /** MAP question.id → displayUrl */
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});
  
  // Sequential enhancement state
  const [isSequentialMode, setIsSequentialMode] = useState(false);
  const [currentEnhancingIndex, setCurrentEnhancingIndex] = useState(-1);
  const [enhancementQueue, setEnhancementQueue] = useState<number[]>([]);
  const [isAnyEnhancing, setIsAnyEnhancing] = useState(false);


  useEffect(() => {
    const prepare = async () => {
      const updated: Record<string, string> = {};
      const webpSupported = browserSupportsType('image/webp');

      await Promise.all(
        questions.map(async q => {
          if (q.mediaType === 'image' && q.mediaUrl) {
            const ext = q.mediaUrl.split('.').pop()?.toLowerCase();
            if (ext === 'webp' && !webpSupported) {
              updated[q.id] = await convertImageToPng(q.mediaUrl);
            } else {
              updated[q.id] = q.mediaUrl;
            }
          }
        })
      );

      if (Object.keys(updated).length) setDisplayUrls(prev => ({ ...prev, ...updated }));
    };
    prepare();
  }, [questions]);

  const pushToWindow = (qs: QuizQuestion[]) => {
    (window as any).QuizAnswers = qs.map(
      ({ id, correctAnswer, fakeAnswers, correctPosition, mediaUrl, topic }) => ({
        id, correctAnswer, fakeAnswers, correctPosition, mediaUrl, topic
      })
    );
  };

  // Ensure updateQ only updates the specific question
  const updateQ = (id: string, patch: Partial<EnhancedQuestion>) => {
    console.log('updateQ called for question:', id, 'with patch:', patch);
    
    const next = questions.map(q => {
      if (q.id === id) {
        const updated = { ...q, ...patch };
        console.log('Updating question:', id, 'from:', q, 'to:', updated);
        return updated;
      }
      return q; // zwrazanie reszty
    });
    
    console.log('Final questions array:', next);
    onQuestionsChange(next); 
    pushToWindow(next);
  };

  const uploadMedia = (qid: string, file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setFileNames(p => ({ ...p, [qid]: file.name }));
    updateQ(qid, { mediaUrl: url, mediaType: type });
  };

  const removeMedia = (qid: string) => {
    setFileNames(p => { const { [qid]: _, ...rest } = p; return rest; });
    updateQ(qid, { mediaUrl: '', mediaType: 'none' });
    setDisplayUrls(prev => { const { [qid]: __, ...rest } = prev; return rest; });
  };

  // single question enhancement
  const enhanceQuestion = async (questionIndex: number) => {
    const q = questions[questionIndex];
    if (!q?.correctAnswer || !q.id) return;

    console.log(`Starting enhancement for question ${questionIndex + 1}: ${q.correctAnswer}`);
    console.log('Question before enhancement:', q);
    
    setIsAnyEnhancing(true);
    setCurrentEnhancingIndex(questionIndex);

    try {
      const res = await fetch(`${backendUrl}/api/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: q.topic || 'General knowledge',
          correctAnswer: q.correctAnswer
        })
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      console.log('Enhancement response for question', questionIndex + 1, ':', data);
      
      // update pytań
      const enhancementPatch = {
        fakeAnswers: data.fakeAnswers ?? [],
        mediaUrl: data.mediaUrl ?? '',
        mediaType: data.mediaUrl?.endsWith('.mp4') ? 'video' : 'image',
        correctPosition: data.correctPosition ?? 1,
        wasEnhanced: true
      } as Partial<EnhancedQuestion>;
      
      console.log('Applying enhancement patch to question:', q.id, enhancementPatch);
      updateQ(q.id, enhancementPatch);

      console.log(`✅ Enhanced question ${questionIndex + 1} successfully`);
    } catch (e) {
      console.error(`❌ Enhancement failed for question ${questionIndex + 1}:`, e);
    } finally {
      setCurrentEnhancingIndex(-1);
      setIsAnyEnhancing(false);
    }
  };

  // Sequential enhancement system
  const startSequentialEnhancement = () => {
    const unenhancedQuestions = questions
      .map((q, index) => ({ question: q, index }))
      .filter(({ question }) =>
        question.correctAnswer &&
        !question.wasEnhanced
      )
      .map(({ index }) => index);

    if (unenhancedQuestions.length === 0) {
      alert('All questions are already enhanced!');
      return;
    }

    console.log(`🚀 Starting sequential enhancement for ${unenhancedQuestions.length} questions`);
    setIsSequentialMode(true);
    setEnhancementQueue(unenhancedQuestions);
  };

  const stopSequentialEnhancement = () => {
    console.log('⏹️ Stopping sequential enhancement');
    setIsSequentialMode(false);
    setEnhancementQueue([]);
    setCurrentEnhancingIndex(-1);
    setIsAnyEnhancing(false);
  };

  // kolejka enhancement
  useEffect(() => {
    const processQueue = async () => {
      if (!isSequentialMode || enhancementQueue.length === 0 || isAnyEnhancing) {
        if (isSequentialMode && enhancementQueue.length === 0) {
          console.log('🎉 Sequential enhancement completed!');
          setIsSequentialMode(false);
        }
        return;
      }

      const nextIndex = enhancementQueue[0];
      console.log(`🔄 Processing question ${nextIndex + 1} from queue`);
      
      await enhanceQuestion(nextIndex);
      
      // usuwanie zrobionych z kolejki 
      setEnhancementQueue(prev => prev.slice(1));
    };

    processQueue();
  }, [isSequentialMode, enhancementQueue, isAnyEnhancing]);

  //  enhancement progressbar
  const totalQuestions = questions.filter(q => q.correctAnswer).length;
  const enhancedQuestions = questions.filter(q => q.wasEnhanced).length;
  const enhancementProgress = totalQuestions > 0 ? (enhancedQuestions / totalQuestions) * 100 : 0;

  if (!questions.length)
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline"
              className="w-8 h-8 rounded-full flex items-center justify-center">2</Badge>
            <CardTitle className="text-xl">Edit Questions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-4">📝</div>
            <p>Your questions will appear here after generation.</p>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="default"
            className="w-8 h-8 rounded-full flex items-center justify-center">2</Badge>
          <CardTitle className="text-xl">Edit Questions</CardTitle>
        </div>
        <CardDescription>
          Adjust answers and attach media. Use sequential enhancement to process all questions automatically.
        </CardDescription>

        {/* Sequential Enhancement Controls */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Sequential Enhancement
              </Label>
              {isSequentialMode && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Processing...
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isSequentialMode ? (
                <Button
                  onClick={startSequentialEnhancement}
                  disabled={isAnyEnhancing || questions.every(q => q.wasEnhanced)}
                  className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start Auto-Enhance
                </Button>
              ) : (
                <Button
                  onClick={stopSequentialEnhancement}
                  variant="destructive"
                  size="sm"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress: {enhancedQuestions}/{totalQuestions} questions enhanced</span>
              <span>{enhancementProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-violet-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${enhancementProgress}%` }}
              />
            </div>
            
            {isSequentialMode && enhancementQueue.length > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Queue: {enhancementQueue.length} questions remaining
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {questions.map((q, idxQ) => {
          const answers = shuffleAnswers(q);
          const maxPos = q.fakeAnswers.length + 1;
          const isCurrentlyEnhancing = currentEnhancingIndex === idxQ;
          const isInQueue = enhancementQueue.includes(idxQ);

          return (
            <div key={q.id} className={`border-t pt-6 first:border-t-0 first:pt-0 transition-all duration-300 ${
              isCurrentlyEnhancing ? 'bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border-blue-200 dark:border-blue-800' : ''
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Badge 
                  variant={isCurrentlyEnhancing ? 'default' : 'secondary'} 
                  className={`text-sm ${isCurrentlyEnhancing ? 'animate-pulse' : ''}`}
                >
                  Question {idxQ + 1}
                  {isCurrentlyEnhancing && <Loader2 className="w-3 h-3 ml-1 animate-spin" />}
                  {isInQueue && !isCurrentlyEnhancing && <span className="ml-1">⏳</span>}
                  {q.wasEnhanced && <span className="ml-1">✅</span>}
                </Badge>
                <div className="flex-1 h-1 bg-gradient-to-r from-blue-200 to-violet-200 rounded-full" />
                
                {/* Question Status */}
                {q.wasEnhanced && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Enhanced
                  </Badge>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Block label="Correct answer">
                    <Input className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-foreground"
                      value={q.correctAnswer}
                      onChange={e => updateQ(q.id, { correctAnswer: e.target.value })}
                      disabled={isAnyEnhancing} />
                  </Block>

                  <Block label={`Fake answers (${q.fakeAnswers.length}/7)`}>
                    <div className="space-y-2 mt-2">
                      {q.fakeAnswers.map((txt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input value={txt}
                            className="text-foreground bg-background"
                            disabled={isAnyEnhancing}
                            onChange={e => {
                              const arr = [...q.fakeAnswers]; arr[i] = e.target.value;
                              updateQ(q.id, { fakeAnswers: arr });
                            }} />
                          <Button size="sm" variant="outline"
                            disabled={isAnyEnhancing}
                            onClick={() => {
                              const arr = q.fakeAnswers.filter((_, ix) => ix !== i);
                              updateQ(q.id, {
                                fakeAnswers: arr,
                                correctPosition: Math.min(arr.length + 1, q.correctPosition)
                              });
                            }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    {q.fakeAnswers.length < 7 && (
                      <Button variant="ghost" size="sm" className="mt-2"
                        disabled={isAnyEnhancing}
                        onClick={() => updateQ(q.id, { fakeAnswers: [...q.fakeAnswers, ''] })}>
                        <Plus className="w-4 h-4 mr-1" /> Add option
                      </Button>
                    )}
                  </Block>

                  <Block label="Correct answer position">
                    <Select value={q.correctPosition.toString()}
                      disabled={isAnyEnhancing}
                      onValueChange={v => updateQ(q.id, { correctPosition: +v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxPos }, (_, k) => k + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>Position {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Block>

                  {/* Indywidualny Enhancement Button -  re-enhancement dostępny tylko wtedy kiedy żaden inny nie ma enhance */}
                  <Button variant="outline"
                    disabled={isAnyEnhancing}
                    onClick={() => enhanceQuestion(idxQ)}
                    className={`${isCurrentlyEnhancing ? 'bg-blue-100 dark:bg-blue-900/20' : ''}`}>
                    {isCurrentlyEnhancing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {q.wasEnhanced ? 'Re-enhance' : 'Enhance'}
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <Block label="Media (URL or file)">
                    <Input placeholder="Paste image / video URL"
                      value={q.mediaUrl || ''}
                      className="text-foreground bg-background"
                      disabled={isAnyEnhancing}
                      onChange={e => {
                        const val = e.target.value.trim();
                        updateQ(q.id, {
                          mediaUrl: val,
                          mediaType: val
                            ? (val.endsWith('.mp4') ? 'video' : 'image')
                            : 'none'
                        });
                      }} />
                    <div className="flex items-center gap-2 mt-2">
                      <input id={`file-${q.id}`} type="file" accept="image/*,video/*"
                        className="hidden"
                        disabled={isAnyEnhancing}
                        onChange={e => {
                          const f = e.target.files?.[0]; if (f) uploadMedia(q.id, f);
                        }} />
                      <Button variant="outline" size="sm" asChild>
                        <label htmlFor={`file-${q.id}`} 
                          className={`cursor-pointer flex items-center gap-1 ${isAnyEnhancing ? 'pointer-events-none opacity-50' : ''}`}>
                          <Upload className="w-4 h-4" /> Upload
                        </label>
                      </Button>

                      {fileNames[q.id] && (
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {fileNames[q.id]}
                        </span>
                      )}

                      {q.mediaUrl && (
                        <Button size="icon" variant="ghost"
                          disabled={isAnyEnhancing}
                          onClick={() => removeMedia(q.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {q.mediaUrl && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="mt-2 relative group cursor-pointer w-full max-w-xs">
                            {q.mediaType === 'video' ? (
                              <video src={q.mediaUrl} className="rounded-md" muted />
                            ) : (
                              <img src={displayUrls[q.id] || q.mediaUrl} className="rounded-md" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center
                                            opacity-0 group-hover:opacity-100 transition-opacity
                                            bg-black/50 text-white text-sm font-semibold">
                              Click to enlarge
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl w-full">
                          {q.mediaType === 'video' ? (
                            <video src={q.mediaUrl} controls className="w-full h-auto rounded-md" />
                          ) : (
                            <img src={displayUrls[q.id] || q.mediaUrl} className="w-full h-auto rounded-md" />
                          )}
                        </DialogContent>
                      </Dialog>
                    )}
                  </Block>

                  <Block label="Answer preview">
                    <div className="p-3 bg-muted/30 rounded-lg space-y-1 text-sm font-mono">
                      {answers.map((a, i) => (
                        <div key={i}
                          className={`${i === q.correctPosition - 1 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-foreground'}`}>
                          {getAnswerLabel(i, labelStyle)}. {a}
                          {i === q.correctPosition - 1 && ' ✅'}
                        </div>
                      ))}
                    </div>
                  </Block>
                </div>  
              </div> 
            </div>
            
          );
        })}
                <div className="p-4 bg-muted/30 rounded-lg border">
          <h3 className="text-lg font-semibold text-foreground mb-3">Answer Style</h3>
          <div className="space-y-3">
            <Label htmlFor="labelStyle">Option labels</Label>
            <Select value={labelStyle} onValueChange={(value: 'abc' | '123') => onLabelStyleChange(value)}>
              <SelectTrigger id="labelStyle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abc">A, B, C, D... (Letters)</SelectItem>
                <SelectItem value="123">1, 2, 3, 4... (Numbers)</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">Preview:</div>
              <div className="space-y-1 text-sm">
                <div>{labelStyle === 'abc' ? 'A' : '1'}. Elon Musk</div>
                <div>{labelStyle === 'abc' ? 'B' : '2'}. Taylor Swift</div>
                <div>{labelStyle === 'abc' ? 'C' : '3'}. Serena Williams ✅</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      {children}
    </div>
  );
}
