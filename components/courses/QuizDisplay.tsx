"use client";

import { useState, useEffect } from "react";

interface Answer {
  id: string;
  answer_text: string;
  sort_order: number;
}

interface Question {
  id: string;
  question_text: string;
  points: number;
  sort_order: number;
  quiz_answers: Answer[];
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  passing_score: number;
  allow_retakes: boolean;
  max_attempts?: number;
  time_limit_minutes?: number;
  quiz_questions: Question[];
}

interface Attempt {
  id: string;
  score?: number;
  passed?: boolean;
  submitted_at?: string;
}

interface QuizDisplayProps {
  quizId: string;
}

export default function QuizDisplay({ quizId }: QuizDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<any>(null);
  const [canAttempt, setCanAttempt] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      if (!res.ok) throw new Error("Failed to load quiz");

      const data = await res.json();
      setQuiz(data.quiz);
      setAttempts(data.attempts);
      setCanAttempt(data.can_attempt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startAttempt = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start attempt");
      }

      const data = await res.json();
      setCurrentAttempt(data.attempt);
      setAnswers({});
      setResults(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!currentAttempt) return;

    // Check all questions are answered
    const allAnswered = quiz?.quiz_questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      setError("Please answer all questions");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const submissionData = {
        answers: Object.entries(answers).map(([question_id, selected_answer_id]) => ({
          question_id,
          selected_answer_id,
        })),
      };

      const res = await fetch(`/api/quizzes/attempts/${currentAttempt.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit quiz");
      }

      const data = await res.json();
      setResults(data.attempt);
      setCurrentAttempt(null);
      loadQuiz();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !quiz) {
    return <div className="p-4">Loading quiz...</div>;
  }

  if (error && !quiz) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!quiz) {
    return <div className="p-4">Quiz not found</div>;
  }

  // Show results
  if (results) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="border border-gray-300 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz Results</h2>
          <div className="mb-4">
            <div className="text-4xl font-bold mb-2">
              {results.score}%
            </div>
            <div className={`text-lg ${results.passed ? "text-green-600" : "text-red-600"}`}>
              {results.passed ? "Passed ✓" : "Failed ✗"}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Passing score: {quiz.passing_score}%
            </div>
          </div>

          {canAttempt && (
            <button
              onClick={startAttempt}
              className="px-6 py-2 bg-black text-white rounded-md"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => setResults(null)}
            className="ml-2 px-6 py-2 bg-gray-300 text-black rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show quiz taking interface
  if (currentAttempt) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-gray-600 mt-2">{quiz.description}</p>
          )}
          {quiz.time_limit_minutes && (
            <p className="text-sm text-gray-500 mt-2">
              Time limit: {quiz.time_limit_minutes} minutes
            </p>
          )}
        </div>

        <div className="space-y-6">
          {quiz.quiz_questions.map((question, index) => (
            <div key={question.id} className="border border-gray-300 rounded-lg p-4">
              <div className="font-medium mb-3">
                {index + 1}. {question.question_text}
              </div>
              <div className="space-y-2">
                {question.quiz_answers.map((answer) => (
                  <label key={answer.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={answer.id}
                      checked={answers[question.id] === answer.id}
                      onChange={(e) =>
                        setAnswers({ ...answers, [question.id]: e.target.value })
                      }
                      className="w-4 h-4"
                    />
                    <span>{answer.answer_text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={submitQuiz}
            disabled={loading}
            className="px-6 py-2 bg-black text-white rounded-md disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Quiz"}
          </button>
          <button
            onClick={() => setCurrentAttempt(null)}
            className="px-6 py-2 bg-gray-300 text-black rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Show quiz overview
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="border border-gray-300 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
        {quiz.description && (
          <p className="text-gray-600 mb-4">{quiz.description}</p>
        )}

        <div className="mb-4 text-sm text-gray-600 space-y-1">
          <div>Questions: {quiz.quiz_questions.length}</div>
          <div>Passing score: {quiz.passing_score}%</div>
          {quiz.time_limit_minutes && (
            <div>Time limit: {quiz.time_limit_minutes} minutes</div>
          )}
          <div>Retakes: {quiz.allow_retakes ? "Allowed" : "Not allowed"}</div>
        </div>

        {attempts.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Previous Attempts</h3>
            <div className="space-y-2">
              {attempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="text-sm p-2 bg-gray-50 rounded"
                >
                  Attempt {attempts.length - index}: {attempt.score}% -{" "}
                  {attempt.passed ? (
                    <span className="text-green-600">Passed</span>
                  ) : (
                    <span className="text-red-600">Failed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {canAttempt ? (
          <button
            onClick={startAttempt}
            disabled={loading}
            className="px-6 py-2 bg-black text-white rounded-md disabled:opacity-50"
          >
            {loading ? "Starting..." : attempts.length > 0 ? "Take Again" : "Start Quiz"}
          </button>
        ) : (
          <div className="text-gray-600">
            No more attempts available
          </div>
        )}
      </div>
    </div>
  );
}
