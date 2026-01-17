import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/community/announcements
 * List published announcements for a community space
 * Query params: space_id (required), tag (optional)
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
    const tag = searchParams.get('tag')

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      )
    }

    // Check if user is a member of the space
    const { data: membership, error: membershipError } = await supabase
      .from('community_space_members')
      .select('status')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || membership?.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build the query
    let query = supabase
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
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())

    // Filter by tag if provided
    if (tag) {
      query = query.contains('tags', [tag])
    }

    // Order by pinned first, then by published date
    query = query
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })

    const { data: announcements, error } = await query

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      )
    }

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/community/announcements:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
