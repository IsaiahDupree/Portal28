// Submit Quiz Attempt API
// feat-040: Submit quiz answers and calculate score

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const submitSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    selected_answer_id: z.string().uuid(),
  })),
});

// POST /api/quizzes/attempts/[attemptId]/submit - Submit quiz answers
export async function POST(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = submitSchema.parse(body);

    // Get attempt and verify ownership
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('id', params.attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Check if already submitted
    if (attempt.submitted_at) {
      return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 });
    }

    // Get all questions and answers for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, points, quiz_answers(*)')
      .eq('quiz_id', attempt.quiz_id);

    if (questionsError || !questions) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Create a map of correct answers
    const correctAnswers = new Map();
    questions.forEach((q: any) => {
      const correctAnswer = q.quiz_answers?.find((a: any) => a.is_correct);
      if (correctAnswer) {
        correctAnswers.set(q.id, correctAnswer.id);
      }
    });

    // Grade each answer
    const attemptAnswers = validatedData.answers.map(answer => {
      const isCorrect = correctAnswers.get(answer.question_id) === answer.selected_answer_id;
      return {
        attempt_id: params.attemptId,
        question_id: answer.question_id,
        selected_answer_id: answer.selected_answer_id,
        is_correct: isCorrect,
      };
    });

    // Insert all answers
    const { error: insertError } = await supabase
      .from('quiz_attempt_answers')
      .insert(attemptAnswers);

    if (insertError) {
      console.error('Error inserting answers:', insertError);
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
    }

    // Calculate score using the database function
    const { data: scoreData, error: scoreError } = await supabase
      .rpc('calculate_quiz_score', { attempt_id_param: params.attemptId });

    if (scoreError) {
      console.error('Error calculating score:', scoreError);
      return NextResponse.json({ error: 'Failed to calculate score' }, { status: 500 });
    }

    const score = scoreData as number;
    const passed = score >= (attempt.quizzes as any).passing_score;

    // Calculate time taken
    const timeTaken = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    // Update attempt with results
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score,
        passed,
        time_taken_seconds: timeTaken,
      })
      .eq('id', params.attemptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attempt:', updateError);
      return NextResponse.json({ error: 'Failed to update attempt' }, { status: 500 });
    }

    // Get results with correct answers and explanations if enabled
    let results = null;
    if ((attempt.quizzes as any).show_correct_answers) {
      const { data: attemptAnswers } = await supabase
        .from('quiz_attempt_answers')
        .select(`
          *,
          quiz_questions (
            id,
            question_text,
            explanation,
            quiz_answers (*)
          )
        `)
        .eq('attempt_id', params.attemptId);

      results = attemptAnswers;
    }

    return NextResponse.json({
      attempt: updatedAttempt,
      results,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/quizzes/attempts/[attemptId]/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/quizzes/attempts/[attemptId]/submit - Get attempt results
export async function GET(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get attempt with quiz info
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('id', params.attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Check if submitted
    if (!attempt.submitted_at) {
      return NextResponse.json({ error: 'Attempt not submitted yet' }, { status: 400 });
    }

    // Get results with answers if enabled
    let results = null;
    if ((attempt.quizzes as any).show_correct_answers) {
      const { data: attemptAnswers } = await supabase
        .from('quiz_attempt_answers')
        .select(`
          *,
          quiz_questions (
            id,
            question_text,
            explanation,
            quiz_answers (*)
          )
        `)
        .eq('attempt_id', params.attemptId);

      results = attemptAnswers;
    }

    return NextResponse.json({
      attempt,
      results,
    });

  } catch (error) {
    console.error('Error in GET /api/quizzes/attempts/[attemptId]/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
