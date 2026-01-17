// Student Quiz Attempts API
// feat-040: Start quiz attempts and submit answers

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// POST /api/quizzes/[id]/attempts - Start a new quiz attempt
export async function POST(
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

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, allow_retakes, max_attempts')
      .eq('id', params.id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Check existing attempts
    const { data: existingAttempts } = await supabase
      .from('quiz_attempts')
      .select('id, submitted_at')
      .eq('quiz_id', params.id)
      .eq('user_id', user.id);

    const submittedAttempts = existingAttempts?.filter(a => a.submitted_at) || [];

    // Check if user can attempt
    if (!quiz.allow_retakes && submittedAttempts.length > 0) {
      return NextResponse.json({ error: 'Retakes not allowed' }, { status: 403 });
    }

    if (quiz.max_attempts && submittedAttempts.length >= quiz.max_attempts) {
      return NextResponse.json({ error: 'Maximum attempts reached' }, { status: 403 });
    }

    // Create new attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: params.id,
        user_id: user.id,
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error creating attempt:', attemptError);
      return NextResponse.json({ error: 'Failed to create attempt' }, { status: 500 });
    }

    return NextResponse.json({ attempt }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/quizzes/[id]/attempts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/quizzes/[id]/attempts - Get user's attempts for this quiz
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

    // Get attempts
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', params.id)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching attempts:', error);
      return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
    }

    return NextResponse.json({ attempts: attempts || [] });

  } catch (error) {
    console.error('Error in GET /api/quizzes/[id]/attempts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
