import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/instructors/me/earnings
 * Get current instructor's earnings
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

    const { data: earnings, error } = await supabase
      .rpc('get_instructor_earnings', {
        p_instructor_id: user.id,
      })
      .single()

    if (error) {
      console.error('Error fetching instructor earnings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch earnings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ earnings })
  } catch (error) {
    console.error('Unexpected error in GET /api/instructors/me/earnings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
