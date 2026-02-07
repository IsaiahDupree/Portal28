import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CommentCreateSchema = z.object({
  content: z.string().min(1),
  parent_id: z.string().uuid().optional(),
})

/**
 * GET /api/events/[eventId]/comments
 * Get comments for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = await createClient()

    // Check if event exists and is published
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('is_published')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_published) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get comments
    const { data: comments, error } = await supabase
      .from('event_comments')
      .select(
        `
        *,
        user:user_id (
          id,
          email
        )
      `
      )
      .eq('event_id', eventId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    return NextResponse.json({ comments })
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/events/[eventId]/comments:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events/[eventId]/comments
 * Create a comment on an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if event exists and is published
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('is_published')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_published) {
      return NextResponse.json(
        { error: 'Cannot comment on unpublished event' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = CommentCreateSchema.parse(body)

    // If parent_id is provided, verify it exists
    if (validatedData.parent_id) {
      const { data: parentComment } = await supabase
        .from('event_comments')
        .select('id')
        .eq('id', validatedData.parent_id)
        .eq('event_id', eventId)
        .single()

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }
    }

    // Create comment
    const { data: comment, error: createError } = await supabase
      .from('event_comments')
      .insert({
        event_id: eventId,
        user_id: user.id,
        content: validatedData.content,
        parent_id: validatedData.parent_id || null,
      })
      .select(
        `
        *,
        user:user_id (
          id,
          email
        )
      `
      )
      .single()

    if (createError) {
      console.error('Error creating comment:', createError)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error(
      'Unexpected error in POST /api/events/[eventId]/comments:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
