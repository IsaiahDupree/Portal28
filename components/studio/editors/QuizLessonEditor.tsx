"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, HelpCircle } from "lucide-react";

interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface QuizLessonEditorProps {
  lessonId: string;
  doc: any;
  onDocChange: (doc: any) => void;
}

export default function QuizLessonEditor({
  lessonId,
  doc,
  onDocChange,
}: QuizLessonEditorProps) {
  const [questions, setQuestions] = useState<Question[]>(doc?.quiz?.questions ?? []);

  useEffect(() => {
    setQuestions(doc?.quiz?.questions ?? []);
  }, [lessonId]);

  function sync(next: Question[]) {
    setQuestions(next);
    onDocChange({ ...doc, quiz: { ...(doc?.quiz ?? {}), questions: next } });
  }

  function addQuestion() {
    sync([
      ...questions,
      {
        id: crypto.randomUUID(),
        prompt: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      },
    ]);
  }

  function updateQuestion(id: string, updates: Partial<Question>) {
    sync(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }

  function removeQuestion(id: string) {
    sync(questions.filter((q) => q.id !== id));
  }

  function updateOption(questionId: string, optionIndex: number, value: string) {
    sync(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const opts = [...q.options];
        opts[optionIndex] = value;
        return { ...q, options: opts };
      })
    );
  }

  function addOption(questionId: string) {
    sync(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        return { ...q, options: [...q.options, ""] };
      })
    );
  }

  function removeOption(questionId: string, optionIndex: number) {
    sync(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const opts = q.options.filter((_, i) => i !== optionIndex);
        return {
          ...q,
          options: opts,
          correctIndex: q.correctIndex >= opts.length ? 0 : q.correctIndex,
        };
      })
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Intro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quiz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium mb-2">Introduction</div>
          <Textarea
            className="min-h-[100px]"
            placeholder="Add an introduction or instructions for this quiz..."
            value={doc?.quiz?.intro ?? ""}
            onChange={(e) =>
              onDocChange({
                ...doc,
                quiz: { ...(doc?.quiz ?? {}), intro: e.target.value },
              })
            }
          />
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(q.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt */}
              <div>
                <Input
                  placeholder="Enter your question..."
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Answer Options</div>
                {q.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctIndex === i}
                      onChange={() => updateQuestion(q.id, { correctIndex: i })}
                      className="h-4 w-4"
                    />
                    <Input
                      className="flex-1"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(q.id, i, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(q.id, i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(q.id)}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add option
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Select the radio button next to the correct answer
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Question Button */}
      <Button onClick={addQuestion} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>

      {questions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <div className="font-medium mb-1">No questions yet</div>
            <p className="text-sm text-muted-foreground">
              Add your first question to build this quiz
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
