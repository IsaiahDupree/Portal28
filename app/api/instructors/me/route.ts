import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/instructors/me
 * Get current user's instructor profile
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

    const { data: instructor, error } = await supabase
      .from('instructor_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !instructor) {
      return NextResponse.json(
        { error: 'Instructor profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ instructor })
  } catch (error) {
    console.error('Unexpected error in GET /api/instructors/me:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
