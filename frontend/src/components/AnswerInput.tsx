'use client';
import { backendUrl } from './backend';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { QuizProject } from '@/types/quiz';

interface AnswerInputProps {
  onAnswersGenerated: (quizData: QuizProject) => void;
  isLoading?: boolean;
}

export function AnswerInput({ onAnswersGenerated, isLoading = false }: AnswerInputProps) {
  const [topic, setTopic] = useState('');
  const [answers, setAnswers] = useState('');
  const [count, setCount] = useState(10);
  const [labelStyle, setLabelStyle] = useState<'abc' | '123'>('abc');
  const [isGenerated, setIsGenerated] = useState(false);

  const [autoTopic, setAutoTopic] = useState(false);
  const [autoAnswers, setAutoAnswers] = useState(false);
  const [autoCount, setAutoCount] = useState(false);

  const answerList = answers
    .split('\n')
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  const showSparkles = autoAnswers || autoTopic || autoCount;

  const handleAutoAnswersChange = (val: boolean) => {
    setAutoAnswers(val);
    if (!val) {
      setAutoTopic(false);
      setAutoCount(false);
    }
  };

  const handleGenerate = async () => {
    if (isGenerated || isLoading) return;

    let finalTopic = autoTopic ? '' : topic.trim();
    const countToSend = autoAnswers ? (autoCount ? undefined : count) : answerList.length;

    if (!autoAnswers && answerList.length === 0) return;
    if (!autoTopic && finalTopic === '') return;

    try {
      setIsGenerated(true);

      // 1 Jeśli AI ma wybrać temat
      if (autoTopic) {
        const topicRes = await fetch(`${backendUrl}/api/topic`, { method: 'POST' });
        const topicData = await topicRes.json();
        finalTopic = topicData.topic;
        setTopic(finalTopic); 
      }

      //  2. Jeśli użytkownik ręcznie wpisał odpowiedzi
      if (!autoAnswers) {
        const quizData: QuizProject = {
          title: finalTopic,
          topic: finalTopic,
          questions: answerList.map((answer, idx) => ({
            id: `q_${idx + 1}`,
            correctAnswer: answer,
            fakeAnswers: [],
            correctPosition: 1,
            mediaType: 'none',
            topic: finalTopic
          })),
          settings: {
            labelStyle: labelStyle, 
            theme: 'modern',
            videoFormat: '16:9',
            questionDuration: 4,
            answerDuration: 1,
            resultDuration: 1,
          },
        };

        onAnswersGenerated(quizData);
        return;
      }

      // 3 Jeśli AI generuje pytania
      const questionsRes = await fetch(`${backendUrl}/api/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: finalTopic, count: countToSend }),
      });

      if (!questionsRes.ok) throw new Error(`Backend returned ${questionsRes.status}`);

      const quiz: QuizProject = await questionsRes.json();

      setTopic(quiz.topic); // refined topic z backendu trafia do inputa nawet jesli bierze

      const quizWithTopics: QuizProject = {
        ...quiz,
        topic: quiz.topic,
        questions: quiz.questions.map((q) => ({
          ...q,
          topic: quiz.topic
        })),
        settings: {
          ...quiz.settings,
          labelStyle: labelStyle // Use selected label style
        }
      };

      onAnswersGenerated(quizWithTopics);
    } catch (err) {
      console.error('❌ Error during quiz generation:', err);
      alert('Something went wrong while generating the quiz.');
      setIsGenerated(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="w-8 h-8 rounded-full flex items-center justify-center">1</Badge>
          <CardTitle className="text-xl">Generate Questions & Style</CardTitle>
        </div>
        <CardDescription>
          Choose how to generate your quiz and select answer style.<br />
          <span className="text-orange-500 font-medium flex items-center gap-1">
            ⚠️ If your topic's unclear, AI will refine it for better visuals.
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Topic automation */}
        <div className="flex items-center justify-between">
          <Label htmlFor="autoTopic" className="text-sm text-muted-foreground flex items-center gap-1">
            Let AI choose the topic <span className="text-xs text-red-500">(not recommended)</span>
            {autoTopic && <Sparkles className="w-4 h-4 text-purple-500" />}
          </Label>
          <Switch
            id="autoTopic"
            checked={autoTopic}
            onCheckedChange={setAutoTopic}
            disabled={!autoAnswers}
          />
        </div>

        {!autoTopic && (
          <div>
            <Label htmlFor="topic">Quiz topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Guess who is this based on childhood photos"
              disabled={isLoading}
              className="text-foreground bg-background"
            />
          </div>
        )}

        {/* Your Answers Section */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-foreground mb-3">Your Answers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Provide your own answers, or let AI generate them for you.
            </p>
          </div>

          {/* Answer automation */}
          <div className="flex items-center justify-between">
            <Label htmlFor="autoAnswers" className="text-sm text-muted-foreground flex items-center gap-1">
              Let AI generate answers
              {autoAnswers && <Sparkles className="w-4 h-4 text-purple-500" />}
            </Label>
            <Switch
              id="autoAnswers"
              checked={autoAnswers}
              onCheckedChange={handleAutoAnswersChange}
            />
          </div>

          {!autoAnswers && (
            <div className="relative">
              <Textarea
                value={answers}
                onChange={(e) => setAnswers(e.target.value)}
                placeholder="Elon Musk&#10;Taylor Swift&#10;Serena Williams"
                className="min-h-[120px] resize-none text-foreground bg-background border-input"
                disabled={isLoading}
              />
              {answerList.length > 0 && (
                <Badge variant="secondary" className="absolute top-2 right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                  {answerList.length} {answerList.length === 1 ? 'answer' : 'answers'}
                </Badge>
              )}
            </div>
          )}

          {autoAnswers && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="autoCount" className="text-sm text-muted-foreground">
                  Let AI decide the number of questions
                </Label>
                <Switch
                  id="autoCount"
                  checked={autoCount}
                  onCheckedChange={setAutoCount}
                />
              </div>

              {!autoCount && (
                <div>
                  <Label htmlFor="questionCount" className="block text-sm text-muted-foreground mb-1">
                    Number of questions (1–20)
                  </Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    disabled={isLoading}
                    className="text-foreground bg-background"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={
            isLoading ||
            isGenerated ||
            (!autoTopic && topic.trim() === '') ||
            (!autoAnswers && answerList.length === 0)
          }
          className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
          size="lg"
        >
          {showSparkles && <Sparkles className="w-4 h-4 mr-2" />}
          {isLoading ? 'Generating...' : 'Generate questions'}
        </Button>

        {!autoAnswers && answerList.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            I will create {answerList.length} {answerList.length === 1 ? 'question' : 'questions'} based on your answers
          </div>
        )}
      </CardContent>
    </Card>
  );
}