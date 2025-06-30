import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  completed: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export function ProgressIndicator({ steps, currentStep, onStepClick }: ProgressIndicatorProps) {
  const maxCompletedStep = Math.max(...steps.filter(s => s.completed).map(s => s.id), 0);
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => onStepClick(step.id)}
                disabled={
                  (step.id === 1 && step.completed) || // Can't go back to step 1
                  (step.id > maxCompletedStep + 1) // Can't skip ahead
                }
                className={cn(
                  "step-indicator transition-all duration-300 hover:scale-105 disabled:hover:scale-100",
                  step.completed && "completed",
                  step.id === currentStep && !step.completed && "active",
                  step.id > currentStep && !step.completed && "pending",
                  (step.id === 1 && step.completed) && "disabled:cursor-not-allowed disabled:opacity-75",
                  (step.id > maxCompletedStep + 1) && "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {step.completed ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{step.id}</span>
                )}
              </button>
              
              {/* Step Title */}
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-sm font-medium transition-colors duration-200 cursor-pointer",
                  step.completed && "text-green-600 dark:text-green-400",
                  step.id === currentStep && !step.completed && "text-primary",
                  step.id > currentStep && !step.completed && "text-muted-foreground",
                  (step.id === 1 && step.completed) && "cursor-not-allowed opacity-75"
                )}
                onClick={() => onStepClick(step.id)}
                >
                  {step.title}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 mt-[-24px]">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    step.completed ? "bg-green-500" : "bg-muted"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-blue-600 to-violet-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%`
          }}
        />
      </div>

      {/* Progress Text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of {steps.length} • {steps.filter(s => s.completed).length} completed
        </p>
      </div>
    </div>
  );
}