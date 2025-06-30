import React, { useState, useEffect } from 'react';
import { QuizBuilder } from './components/QuizBuilder';
import { ThemeProvider } from './components/ThemeProvider';
import { Sparkles, Moon, Sun } from 'lucide-react';
import { Button } from './components/ui/button';

function App() {
  const [isDark, setIsDark] = useState(true); // Default to dark mode

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Default to dark mode if no saved preference
    setIsDark(savedTheme === 'light' ? false : true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-border/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                    Quiz Builder Pro
                  </h1>
                  <p className="text-xs text-muted-foreground">Create engaging video quizzes</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDark(!isDark)}
                  className="rounded-full"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Online</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
          
          {/* Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                Build Professional
                <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent"> Video Quizzes</span>
              </h2>
              
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Create engaging, interactive video content with our intuitive quiz builder. 
                Perfect for education, marketing, and entertainment.
              </p>
            </div>

            <QuizBuilder />
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-24 border-t border-border/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-sm text-muted-foreground">
              <p>© 2025 All rights reserved • Tomasz Płonka</p>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;