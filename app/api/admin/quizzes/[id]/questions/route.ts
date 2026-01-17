// Admin Quiz Questions API
// feat-040: Manage quiz questions and answers

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const answerSchema = z.object({
  answer_text: z.string().min(1),
  is_correct: z.boolean(),
  sort_order: z.number().int().default(0),
});

const createQuestionSchema = z.object({
  question_text: z.string().min(1),
  question_type: z.string().default('multiple_choice'),
  points: z.number().int().positive().default(1),
  explanation: z.string().optional(),
  sort_order: z.number().int().default(0),
  answers: z.array(answerSchema).min(2).max(10),
});

// POST /api/admin/quizzes/[id]/questions - Add question to quiz
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
    const validatedData = createQuestionSchema.parse(body);

    // Verify quiz exists
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', params.id)
      .single();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Validate that at least one answer is correct
    const hasCorrectAnswer = validatedData.answers.some(a => a.is_correct);
    if (!hasCorrectAnswer) {
      return NextResponse.json(
        { error: 'At least one answer must be correct' },
        { status: 400 }
      );
    }

    // Create question
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: params.id,
        question_text: validatedData.question_text,
        question_type: validatedData.question_type,
        points: validatedData.points,
        explanation: validatedData.explanation,
        sort_order: validatedData.sort_order,
      })
      .select()
      .single();

    if (questionError) {
      console.error('Error creating question:', questionError);
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }

    // Create answers
    const answersToInsert = validatedData.answers.map((a, index) => ({
      question_id: question.id,
      answer_text: a.answer_text,
      is_correct: a.is_correct,
      sort_order: a.sort_order ?? index,
    }));

    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .insert(answersToInsert)
      .select();

    if (answersError) {
      console.error('Error creating answers:', answersError);
      // Rollback question creation
      await supabase.from('quiz_questions').delete().eq('id', question.id);
      return NextResponse.json({ error: 'Failed to create answers' }, { status: 500 });
    }

    return NextResponse.json({
      question: {
        ...question,
        quiz_answers: answers,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/admin/quizzes/[id]/questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/quizzes/[id]/questions/reorder - Reorder questions
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

    // Parse request body
    const body = await request.json();
    const { question_ids } = body;

    if (!Array.isArray(question_ids)) {
      return NextResponse.json({ error: 'question_ids must be an array' }, { status: 400 });
    }

    // Update sort_order for each question
    const updates = question_ids.map((id, index) =>
      supabase
        .from('quiz_questions')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('quiz_id', params.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ message: 'Questions reordered successfully' });

  } catch (error) {
    console.error('Error in PATCH /api/admin/quizzes/[id]/questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
