// Student Quiz API
// feat-040: View quiz details and start attempts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/quizzes/[id] - Get quiz for student (with access check)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get quiz with questions (RLS will handle access control)
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          id,
          question_text,
          question_type,
          points,
          sort_order,
          quiz_answers (
            id,
            answer_text,
            sort_order
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
      }
      console.error('Error fetching quiz:', error);
      return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
    }

    // Sort questions and answers (hide correct answers and explanations)
    if (quiz.quiz_questions) {
      // Apply randomization if enabled
      if (quiz.randomize_questions) {
        quiz.quiz_questions.sort(() => Math.random() - 0.5);
      } else {
        quiz.quiz_questions.sort((a: any, b: any) => a.sort_order - b.sort_order);
      }

      quiz.quiz_questions.forEach((q: any) => {
        if (q.quiz_answers) {
          if (quiz.randomize_answers) {
            q.quiz_answers.sort(() => Math.random() - 0.5);
          } else {
            q.quiz_answers.sort((a: any, b: any) => a.sort_order - b.sort_order);
          }
        }
        // Remove explanation for now (shown after submission)
        delete q.explanation;
      });
    }

    // Get student's attempt history
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('id, started_at, submitted_at, score, passed')
      .eq('quiz_id', params.id)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    return NextResponse.json({
      quiz,
      attempts: attempts || [],
      can_attempt: quiz.allow_retakes || (attempts?.length || 0) === 0,
      attempts_remaining: quiz.max_attempts
        ? Math.max(0, quiz.max_attempts - (attempts?.filter(a => a.submitted_at).length || 0))
        : null,
    });

  } catch (error) {
    console.error('Error in GET /api/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
