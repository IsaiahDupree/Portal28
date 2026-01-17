// Admin Quiz Detail API
// feat-040: Update and delete individual quizzes

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  passing_score: z.number().int().min(0).max(100).optional(),
  allow_retakes: z.boolean().optional(),
  max_attempts: z.number().int().positive().optional().nullable(),
  time_limit_minutes: z.number().int().positive().optional().nullable(),
  show_correct_answers: z.boolean().optional(),
  randomize_questions: z.boolean().optional(),
  randomize_answers: z.boolean().optional(),
});

// GET /api/admin/quizzes/[id] - Get quiz with questions
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

    // Check admin
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get quiz with questions and answers
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          *,
          quiz_answers (*)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      console.error('Error fetching quiz:', error);
      return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
    }

    // Sort questions and answers by sort_order
    if (quiz.quiz_questions) {
      quiz.quiz_questions.sort((a: any, b: any) => a.sort_order - b.sort_order);
      quiz.quiz_questions.forEach((q: any) => {
        if (q.quiz_answers) {
          q.quiz_answers.sort((a: any, b: any) => a.sort_order - b.sort_order);
        }
      });
    }

    return NextResponse.json({ quiz });

  } catch (error) {
    console.error('Error in GET /api/admin/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/quizzes/[id] - Update quiz
export async function PATCH(
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

    // Check admin
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateQuizSchema.parse(body);

    // Update quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      console.error('Error updating quiz:', error);
      return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }

    return NextResponse.json({ quiz });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Error in PATCH /api/admin/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/quizzes/[id] - Delete quiz
export async function DELETE(
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

    // Check admin
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete quiz (cascade will delete questions, answers, attempts)
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting quiz:', error);
      return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Quiz deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/admin/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
