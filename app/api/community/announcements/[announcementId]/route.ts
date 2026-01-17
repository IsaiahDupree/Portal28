import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/community/announcements/[announcementId]
 * Get a single published announcement
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
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .single()

    if (error) {
      console.error('Error fetching announcement:', error)
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the space
    const { data: membership, error: membershipError } = await supabase
      .from('community_space_members')
      .select('status')
      .eq('space_id', announcement.space_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/community/announcements/[announcementId]:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
