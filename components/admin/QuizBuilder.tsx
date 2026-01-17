"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Answer {
  id?: string;
  answer_text: string;
  is_correct: boolean;
  sort_order: number;
}

interface Question {
  id?: string;
  question_text: string;
  points: number;
  explanation?: string;
  sort_order: number;
  answers: Answer[];
}

interface Quiz {
  id?: string;
  lesson_id: string;
  title: string;
  description?: string;
  passing_score: number;
  allow_retakes: boolean;
  max_attempts?: number;
  time_limit_minutes?: number;
  show_correct_answers: boolean;
  randomize_questions: boolean;
  randomize_answers: boolean;
}

interface QuizBuilderProps {
  lessonId: string;
  existingQuiz?: Quiz & { quiz_questions?: Question[] };
}

export default function QuizBuilder({ lessonId, existingQuiz }: QuizBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [quiz, setQuiz] = useState<Quiz>({
    lesson_id: lessonId,
    title: existingQuiz?.title || "",
    description: existingQuiz?.description || "",
    passing_score: existingQuiz?.passing_score || 70,
    allow_retakes: existingQuiz?.allow_retakes ?? true,
    max_attempts: existingQuiz?.max_attempts,
    time_limit_minutes: existingQuiz?.time_limit_minutes,
    show_correct_answers: existingQuiz?.show_correct_answers ?? true,
    randomize_questions: existingQuiz?.randomize_questions ?? false,
    randomize_answers: existingQuiz?.randomize_answers ?? false,
  });

  const [questions, setQuestions] = useState<Question[]>(
    existingQuiz?.quiz_questions || []
  );

  const handleCreateQuiz = async () => {
    if (!quiz.title.trim()) {
      setError("Quiz title is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create quiz");
      }

      const data = await res.json();
      router.refresh();
      alert("Quiz created successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (question: Question) => {
    if (!existingQuiz?.id) {
      setError("Please create the quiz first before adding questions");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/quizzes/${existingQuiz.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(question),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add question");
      }

      router.refresh();
      alert("Question added successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Quiz Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Quiz Title *
            </label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter quiz title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={quiz.description}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Passing Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={quiz.passing_score}
                onChange={(e) => setQuiz({ ...quiz, passing_score: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={quiz.time_limit_minutes || ""}
                onChange={(e) => setQuiz({ ...quiz, time_limit_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quiz.allow_retakes}
                onChange={(e) => setQuiz({ ...quiz, allow_retakes: e.target.checked })}
              />
              <span className="text-sm">Allow retakes</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quiz.show_correct_answers}
                onChange={(e) => setQuiz({ ...quiz, show_correct_answers: e.target.checked })}
              />
              <span className="text-sm">Show correct answers after submission</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quiz.randomize_questions}
                onChange={(e) => setQuiz({ ...quiz, randomize_questions: e.target.checked })}
              />
              <span className="text-sm">Randomize question order</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quiz.randomize_answers}
                onChange={(e) => setQuiz({ ...quiz, randomize_answers: e.target.checked })}
              />
              <span className="text-sm">Randomize answer order</span>
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {!existingQuiz && (
            <button
              onClick={handleCreateQuiz}
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Quiz"}
            </button>
          )}
        </div>
      </div>

      {existingQuiz && (
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Questions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add questions to this quiz. Each question must have at least 2 answers, with at least one marked as correct.
          </p>
          <QuestionBuilder onAddQuestion={handleAddQuestion} loading={loading} />
        </div>
      )}
    </div>
  );
}

function QuestionBuilder({
  onAddQuestion,
  loading,
}: {
  onAddQuestion: (question: Question) => void;
  loading: boolean;
}) {
  const [question, setQuestion] = useState<Question>({
    question_text: "",
    points: 1,
    explanation: "",
    sort_order: 0,
    answers: [
      { answer_text: "", is_correct: false, sort_order: 0 },
      { answer_text: "", is_correct: false, sort_order: 1 },
    ],
  });

  const handleAddAnswer = () => {
    setQuestion({
      ...question,
      answers: [
        ...question.answers,
        { answer_text: "", is_correct: false, sort_order: question.answers.length },
      ],
    });
  };

  const handleRemoveAnswer = (index: number) => {
    if (question.answers.length <= 2) return;
    setQuestion({
      ...question,
      answers: question.answers.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!question.question_text.trim()) {
      alert("Question text is required");
      return;
    }

    const hasCorrect = question.answers.some((a) => a.is_correct);
    if (!hasCorrect) {
      alert("At least one answer must be marked as correct");
      return;
    }

    const hasText = question.answers.every((a) => a.answer_text.trim());
    if (!hasText) {
      alert("All answers must have text");
      return;
    }

    onAddQuestion(question);

    // Reset form
    setQuestion({
      question_text: "",
      points: 1,
      explanation: "",
      sort_order: 0,
      answers: [
        { answer_text: "", is_correct: false, sort_order: 0 },
        { answer_text: "", is_correct: false, sort_order: 1 },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Question *</label>
        <textarea
          value={question.question_text}
          onChange={(e) => setQuestion({ ...question, question_text: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder="Enter question"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Answers *</label>
        {question.answers.map((answer, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={answer.is_correct}
              onChange={(e) => {
                const newAnswers = [...question.answers];
                newAnswers[index].is_correct = e.target.checked;
                setQuestion({ ...question, answers: newAnswers });
              }}
              title="Mark as correct"
            />
            <input
              type="text"
              value={answer.answer_text}
              onChange={(e) => {
                const newAnswers = [...question.answers];
                newAnswers[index].answer_text = e.target.value;
                setQuestion({ ...question, answers: newAnswers });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder={`Answer ${index + 1}`}
            />
            {question.answers.length > 2 && (
              <button
                onClick={() => handleRemoveAnswer(index)}
                className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleAddAnswer}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add Answer
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Explanation (optional)
        </label>
        <textarea
          value={question.explanation}
          onChange={(e) => setQuestion({ ...question, explanation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={2}
          placeholder="Explain the correct answer"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Question"}
      </button>
    </div>
  );
}
