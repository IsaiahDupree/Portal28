import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const submitSchema = z.object({
  lessonId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedOption: z.number().int().min(0),
  })),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lessonId, answers } = parsed.data;

  // Get quiz questions for this lesson
  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("id, correct_option")
    .eq("lesson_id", lessonId);

  if (questionsError) {
    return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  // Create a map of correct answers
  const correctAnswers = new Map(
    questions?.map(q => [q.id, q.correct_option]) || []
  );

  // Calculate score
  let correctCount = 0;
  const gradedAnswers = answers.map(answer => {
    const isCorrect = correctAnswers.get(answer.questionId) === answer.selectedOption;
    if (isCorrect) correctCount++;
    return {
      ...answer,
      isCorrect,
    };
  });

  const totalQuestions = questions?.length || 0;
  const scorePercent = totalQuestions > 0 
    ? Math.round((correctCount / totalQuestions) * 100) 
    : 0;
  const passed = scorePercent >= 70; // 70% passing threshold

  // Create quiz attempt record
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      score_percent: scorePercent,
      passed,
      answers: gradedAnswers,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  // Save individual answers
  const answerRecords = answers.map(answer => ({
    attempt_id: attempt.id,
    question_id: answer.questionId,
    selected_option: answer.selectedOption,
    is_correct: correctAnswers.get(answer.questionId) === answer.selectedOption,
  }));

  await supabase.from("quiz_answers").insert(answerRecords);

  // If passed, mark lesson as complete
  if (passed) {
    await supabase
      .from("lesson_progress")
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        status: "completed",
        progress_percent: 100,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
  }

  return NextResponse.json({
    attemptId: attempt.id,
    score: scorePercent,
    passed,
    correctCount,
    totalQuestions,
    gradedAnswers,
  });
}

// GET - Get user's quiz attempts for a lesson
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get("lessonId");

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attempts });
}
