// Admin Quiz Management API
// feat-040: Create and manage quizzes

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for quiz creation
const createQuizSchema = z.object({
  lesson_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  passing_score: z.number().int().min(0).max(100).default(70),
  allow_retakes: z.boolean().default(true),
  max_attempts: z.number().int().positive().optional(),
  time_limit_minutes: z.number().int().positive().optional(),
  show_correct_answers: z.boolean().default(true),
  randomize_questions: z.boolean().default(false),
  randomize_answers: z.boolean().default(false),
});

// GET /api/admin/quizzes?lesson_id=xxx - Get quizzes for a lesson
export async function GET(request: Request) {
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

    // Get lesson_id from query
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lesson_id');

    if (!lessonId) {
      return NextResponse.json({ error: 'lesson_id required' }, { status: 400 });
    }

    // Get quizzes for lesson
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }

    return NextResponse.json({ quizzes });

  } catch (error) {
    console.error('Error in GET /api/admin/quizzes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/quizzes - Create a new quiz
export async function POST(request: Request) {
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
    const validatedData = createQuizSchema.parse(body);

    // Verify lesson exists
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', validatedData.lesson_id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Create quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error('Error creating quiz:', error);
      return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }

    return NextResponse.json({ quiz }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/admin/quizzes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
