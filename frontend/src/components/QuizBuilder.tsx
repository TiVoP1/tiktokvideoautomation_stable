'use client';

import { useState } from 'react';
import { AnswerInput } from './AnswerInput';
import { BrandingSettings } from './BrandingSettings';
import { TimingSettings } from './TimingSettings';
import { QuestionEditor } from './QuestionEditor';
import { GenerationPanel } from './GenerationPanel';
import { ProgressIndicator } from './ProgressIndicator';

import { QuizProject, QuizQuestion, QuizSettings } from '@/types/quiz';

export function QuizBuilder() {
  const [quiz, setQuiz] = useState<QuizProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Track which steps have been explicitly completed
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // 🔥 CRITICAL FIX: Generate proper unique IDs for questions
  const generateQuestionId = (index: number): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `q_${timestamp}_${index}_${random}`;
  };

  const handleQuizGenerated = (generated: any) => {
    setIsGenerating(true);

    console.log('🔥 Raw generated data:', generated);

    // 🔥 CRITICAL FIX: Ensure every question gets a proper unique ID
    const mappedQuestions: QuizQuestion[] = generated.questions.map((q: any, index: number) => {
      const questionId = generateQuestionId(index);
      
      console.log(`🔥 Mapping question ${index}:`, {
        originalId: q.question_id,
        newId: questionId,
        correctAnswer: q.correctAnswer ?? q.options?.[q.correct_option],
        originalQuestion: q
      });

      return {
        id: questionId, // 🔥 ALWAYS use our generated ID
        correctAnswer: q.correctAnswer ?? q.options?.[q.correct_option] ?? '',
        fakeAnswers: q.fakeAnswers ?? (q.options ? Object.entries(q.options)
          .filter(([key]) => key !== q.correct_option)
          .map(([_, val]) => val) : []),
        correctPosition: q.correctPosition ?? (q.correct_option ? ['A', 'B', 'C', 'D'].indexOf(q.correct_option) + 1 : 1),
        mediaType: 'image' as const,
        mediaUrl: q.mediaUrl ?? q.shot ?? '',
        topic: generated.topic || 'General Knowledge'
      };
    });

    console.log('🔥 Final mapped questions with IDs:', mappedQuestions);

    const settings: QuizSettings = generated.settings || {
      theme: 'modern',
      videoFormat: '9:16',
      labelStyle: 'abc',
      questionDuration: 4,
      answerDuration: 1,
      resultDuration: 1,
    };

    const project: QuizProject = {
      title: generated.title || generated.quiz?.title || 'Untitled Quiz',
      topic: generated.topic || 'General Knowledge',
      questions: mappedQuestions,
      settings,
    };

    console.log('🔥 Final quiz project:', project);

    setQuiz(project);
    setIsGenerating(false);
    
    // Mark step 1 as completed and move to step 2
    setCompletedSteps(new Set([1]));
    setCurrentStep(2);
  };

  const handleQuestionsUpdate = (updated: QuizQuestion[]) => {
    if (!quiz) return;
    
    console.log('🔥 Updating questions in QuizBuilder:', updated);
    
    // 🔥 VALIDATION: Ensure all questions have valid IDs
    const validatedQuestions = updated.map((q, index) => {
      if (!q.id || q.id === 'undefined' || q.id.includes('undefined')) {
        const newId = generateQuestionId(index);
        console.log(`🔥 FIXING invalid question ID: ${q.id} → ${newId}`);
        return { ...q, id: newId };
      }
      return q;
    });
    
    setQuiz({ ...quiz, questions: validatedQuestions });
  };

  const handleSettingsUpdate = (updates: Partial<QuizSettings>) => {
    if (!quiz) return;
    setQuiz({ ...quiz, settings: { ...quiz.settings, ...updates } });
  };

  const handleStepClick = (stepId: number) => {
    // Step 1 cannot be navigated back to once completed
    if (stepId === 1 && completedSteps.has(1)) {
      return;
    }
    
    // Allow navigation to any completed step or the next available step
    const maxCompletedStep = Math.max(...Array.from(completedSteps), 0);
    if (completedSteps.has(stepId) || stepId === currentStep || stepId <= maxCompletedStep + 1) {
      setCurrentStep(stepId);
    }
  };

  const markStepCompleted = (stepId: number) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  // 🔥 MERGED STEPS: Removed Answer Style step, now only 5 steps total
  const steps = [
    { 
      id: 1, 
      title: 'Generate Questions', 
      completed: completedSteps.has(1)
    },
    { 
      id: 2, 
      title: 'Edit Questions', 
      completed: completedSteps.has(2)
    },
    { 
      id: 3, 
      title: 'Branding', 
      completed: completedSteps.has(3)
    },
    { 
      id: 4, 
      title: 'Timing', 
      completed: completedSteps.has(4)
    },
    { 
      id: 5, 
      title: 'Generate Video', 
      completed: completedSteps.has(5)
    },
  ];

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="animate-fade-in">
            <AnswerInput
              onAnswersGenerated={handleQuizGenerated}
              isLoading={isGenerating}
            />
          </div>
        );
      
      case 2:
        return quiz ? (
          <div className="animate-slide-in">
            <QuestionEditor
              questions={quiz.questions}
              labelStyle={quiz.settings.labelStyle}
              onQuestionsChange={handleQuestionsUpdate}
              onLabelStyleChange={(style) => handleSettingsUpdate({ labelStyle: style })}
            />
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  markStepCompleted(2);
                  setCurrentStep(3);
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-700 hover:to-violet-700 transition-all"
              >
                Continue to Branding →
              </button>
            </div>
          </div>
        ) : null;
      
      case 3:
        return quiz ? (
          <div className="animate-slide-in">
            <BrandingSettings
              settings={quiz.settings}
              onSettingsChange={handleSettingsUpdate}
            />
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  markStepCompleted(3);
                  setCurrentStep(4);
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-700 hover:to-violet-700 transition-all"
              >
                Continue to Timing →
              </button>
            </div>
          </div>
        ) : null;
      
      case 4:
        return quiz ? (
          <div className="animate-slide-in">
            <TimingSettings
              settings={quiz.settings}
              topic={quiz.questions[0]?.topic || quiz.topic}
              questionCount={quiz.questions.length}
              onSettingsChange={handleSettingsUpdate}
            />
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  markStepCompleted(4);
                  setCurrentStep(5);
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-700 hover:to-violet-700 transition-all"
              >
                Continue to Generation →
              </button>
            </div>
          </div>
        ) : null;
      
      case 5:
        return quiz ? (
          <div className="animate-slide-in">
            <GenerationPanel
              quiz={quiz}
              onGenerate={() => {
                markStepCompleted(5);
                console.log('Generate clicked');
              }}
            />
          </div>
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <ProgressIndicator 
        steps={steps} 
        currentStep={currentStep} 
        onStepClick={handleStepClick}
      />

      {/* Quiz Topic Display */}
      {quiz?.topic && (
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Quiz Topic: <span className="text-blue-600 dark:text-blue-400">{quiz.topic}</span>
            </span>
          </div>
        </div>
      )}

      {/* Current Step Content */}
      <div className="min-h-[400px]">
        {renderCurrentStep()}
      </div>
    </div>
  );
}