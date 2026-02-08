import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createBulkNotifications } from '@/lib/notifications/createNotification'
import { sendAnnouncementToAll } from '@/lib/email/sendAnnouncementEmail'

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  space_id: z.string().uuid(),
  is_pinned: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  published_at: z.string().datetime().nullable().optional(),
  send_email: z.boolean().default(false),
})

/**
 * GET /api/admin/announcements
 * List all announcements for admin (including drafts)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const spaceId = searchParams.get('space_id')

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      )
    }

    // Check if user is admin of the space
    const { data: membership, error: membershipError } = await supabase
      .from('community_space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all announcements (including drafts) for the space
    const { data: announcements, error } = await supabase
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
      .eq('space_id', spaceId)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: true })

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      )
    }

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/announcements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createAnnouncementSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check if user is admin of the space
    const { data: membership, error: membershipError } = await supabase
      .from('community_space_members')
      .select('role')
      .eq('space_id', data.space_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create the announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        space_id: data.space_id,
        author_id: user.id,
        is_pinned: data.is_pinned,
        tags: data.tags,
        published_at: data.published_at || null,
        send_email: data.send_email,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating announcement:', error)
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      )
    }

    // If announcement is published, notify all space members
    if (data.published_at) {
      const { data: members } = await supabase
        .from('community_space_members')
        .select('user_id')
        .eq('space_id', data.space_id)

      if (members && members.length > 0) {
        const notifications = members
          .filter(m => m.user_id !== user.id) // Don't notify the author
          .map(member => ({
            userId: member.user_id,
            type: 'announcement' as const,
            title: 'New Announcement',
            message: data.title,
            link: `/app/community/announcements/${announcement.id}`,
            metadata: {
              announcementId: announcement.id,
              spaceId: data.space_id,
            },
          }))

        if (notifications.length > 0) {
          createBulkNotifications(notifications).catch(err =>
            console.error('Failed to create announcement notifications:', err)
          )
        }
      }

      // Send email notifications if requested
      if (data.send_email && announcement) {
        sendAnnouncementToAll(announcement.id).catch(err =>
          console.error('Failed to send announcement emails:', err)
        )
      }
    }

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/announcements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
