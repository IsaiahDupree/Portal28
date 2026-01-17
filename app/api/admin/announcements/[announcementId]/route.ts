import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  is_pinned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  published_at: z.string().datetime().nullable().optional(),
})

/**
 * GET /api/admin/announcements/[announcementId]
 * Get a single announcement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { announcementId: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { announcementId } = params

    // Fetch the announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select(
        `
        *,
        author:author_id (
          id,
          email,
          raw_user_meta_data
        )
      `
      )
      .eq('id', announcementId)
      .single()

    if (error) {
      console.error('Error fetching announcement:', error)
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if user is admin of the space
    const { data: membership, error: membershipError } = await supabase
      .from('community_space_members')
      .select('role')
      .eq('space_id', announcement.space_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/admin/announcements/[announcementId]:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/announcements/[announcementId]
 * Update an announcement
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { announcementId: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { announcementId } = params
    const body = await request.json()
    const validationResult = updateAnnouncementSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Fetch the announcement to check permissions
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('space_id')
      .eq('id', announcementId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if user is admin of the space
    const { data: membership, error: membershipError } = await supabase
      .from('community_space_members')
      .select('role')
      .eq('space_id', existingAnnouncement.space_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update the announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(data)
      .eq('id', announcementId)
      .select()
      .single()

    if (error) {
      console.error('Error updating announcement:', error)
      return NextResponse.json(
        { error: 'Failed to update announcement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error(
      'Unexpected error in PUT /api/admin/announcements/[announcementId]:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/announcements/[announcementId]
 * Delete an announcement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { announcementId: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { announcementId } = params

    // Fetch the announcement to check permissions
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('space_id')
      .eq('id', announcementId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if user is admin of the space
    const { data: membership, error: membershipError } = await supabase
      .from('community_space_members')
      .select('role')
      .eq('space_id', existingAnnouncement.space_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the announcement
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)

    if (error) {
      console.error('Error deleting announcement:', error)
      return NextResponse.json(
        { error: 'Failed to delete announcement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/admin/announcements/[announcementId]:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
