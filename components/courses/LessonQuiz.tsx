"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  ChevronRight,
  Trophy,
  RotateCcw
} from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  passing_score: number;
  questions: QuizQuestion[];
}

interface LessonQuizProps {
  quiz: Quiz;
  userId?: string;
  onComplete?: (score: number, passed: boolean) => void;
}

export function LessonQuiz({ quiz, userId, onComplete }: LessonQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const question = quiz.questions[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];
  const isAnswered = selectedAnswer !== null;
  const isCorrect = isAnswered && selectedAnswer === question.correct_index;

  const handleSelectAnswer = (index: number) => {
    if (showExplanation) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = index;
    setSelectedAnswers(newAnswers);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate final score
      const correctCount = selectedAnswers.filter(
        (ans, idx) => ans === quiz.questions[idx].correct_index
      ).length;
      const score = Math.round((correctCount / quiz.questions.length) * 100);
      const passed = score >= quiz.passing_score;
      setShowResults(true);
      onComplete?.(score, passed);
    }
  };

  const handleRetake = () => {
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(quiz.questions.length).fill(null));
    setShowResults(false);
    setShowExplanation(false);
  };

  if (showResults) {
    const correctCount = selectedAnswers.filter(
      (ans, idx) => ans === quiz.questions[idx].correct_index
    ).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passing_score;

    return (
      <Card>
        <CardHeader className="text-center">
          <div className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4",
            passed ? "bg-green-100 dark:bg-green-900/20" : "bg-amber-100 dark:bg-amber-900/20"
          )}>
            {passed ? (
              <Trophy className="h-8 w-8 text-green-600" />
            ) : (
              <RotateCcw className="h-8 w-8 text-amber-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {passed ? "Congratulations!" : "Keep Learning!"}
          </CardTitle>
          <CardDescription>
            You scored {score}% ({correctCount}/{quiz.questions.length} correct)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Your Score</span>
              <span className="font-medium">{score}%</span>
            </div>
            <Progress value={score} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              Passing score: {quiz.passing_score}%
            </p>
          </div>
          
          {!passed && (
            <Button onClick={handleRetake} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-5 w-5" />
            {quiz.title}
          </CardTitle>
          <Badge variant="outline">
            {currentQuestion + 1} / {quiz.questions.length}
          </Badge>
        </div>
        <Progress 
          value={((currentQuestion + (isAnswered ? 1 : 0)) / quiz.questions.length) * 100} 
          className="h-1 mt-2" 
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{question.question}</p>

        <div className="space-y-2">
          {question.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrectOption = idx === question.correct_index;
            const showCorrectness = showExplanation;

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                disabled={showExplanation}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                  !showExplanation && "hover:border-primary hover:bg-accent",
                  isSelected && !showCorrectness && "border-primary bg-primary/5",
                  showCorrectness && isCorrectOption && "border-green-500 bg-green-50 dark:bg-green-900/20",
                  showCorrectness && isSelected && !isCorrectOption && "border-red-500 bg-red-50 dark:bg-red-900/20"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border text-sm font-medium",
                  showCorrectness && isCorrectOption && "border-green-500 bg-green-500 text-white",
                  showCorrectness && isSelected && !isCorrectOption && "border-red-500 bg-red-500 text-white"
                )}>
                  {showCorrectness && isCorrectOption ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : showCorrectness && isSelected && !isCorrectOption ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </div>
                <span className="flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {showExplanation && question.explanation && (
          <div className={cn(
            "p-4 rounded-lg text-sm",
            isCorrect ? "bg-green-50 dark:bg-green-900/20 border border-green-200" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200"
          )}>
            <p className="font-medium mb-1">
              {isCorrect ? "Correct!" : "Not quite right"}
            </p>
            <p className="text-muted-foreground">{question.explanation}</p>
          </div>
        )}

        {showExplanation && (
          <Button onClick={handleNext} className="w-full">
            {currentQuestion < quiz.questions.length - 1 ? (
              <>
                Next Question
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "See Results"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
