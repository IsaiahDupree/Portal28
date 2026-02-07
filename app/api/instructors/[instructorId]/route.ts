import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const InstructorProfileUpdateSchema = z.object({
  display_name: z.string().min(1).optional(),
  bio: z.string().optional(),
  profile_image_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  twitter_handle: z.string().optional(),
  expertise_areas: z.array(z.string()).optional(),
  years_of_experience: z.number().int().min(0).optional(),
  is_verified: z.boolean().optional(),
  payout_method: z.enum(['manual', 'stripe_connect']).optional(),
})

/**
 * GET /api/instructors/[instructorId]
 * Get a single instructor profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params
    const supabase = await createClient()

    const { data: instructor, error } = await supabase
      .from('instructor_profiles')
      .select(`
        *,
        user:id (
          email,
          role
        )
      `)
      .eq('id', instructorId)
      .single()

    if (error || !instructor) {
      return NextResponse.json(
        { error: 'Instructor not found' },
        { status: 404 }
      )
    }

    // Get instructor's courses
    const { data: courses } = await supabase.rpc('get_instructor_courses', {
      p_instructor_id: instructorId,
    })

    // Get instructor's earnings
    const { data: earnings } = await supabase
      .rpc('get_instructor_earnings', {
        p_instructor_id: instructorId,
      })
      .single()

    return NextResponse.json({
      instructor,
      courses: courses || [],
      earnings: earnings || {
        total_earnings_cents: 0,
        pending_cents: 0,
        paid_cents: 0,
        split_count: 0,
      },
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/instructors/[instructorId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/instructors/[instructorId]
 * Update an instructor profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or the instructor themselves
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.role === 'admin'
    const isOwnProfile = user.id === instructorId

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = InstructorProfileUpdateSchema.parse(body)

    // Non-admins cannot change is_verified
    if (!isAdmin && validatedData.is_verified !== undefined) {
      delete validatedData.is_verified
    }

    // Update instructor profile
    const { data: profile, error: updateError } = await supabase
      .from('instructor_profiles')
      .update(validatedData)
      .eq('id', instructorId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating instructor profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update instructor profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in PATCH /api/instructors/[instructorId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/instructors/[instructorId]
 * Delete an instructor profile (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete instructor profile (will cascade to course assignments)
    const { error: deleteError } = await supabase
      .from('instructor_profiles')
      .delete()
      .eq('id', instructorId)

    if (deleteError) {
      console.error('Error deleting instructor profile:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete instructor profile' },
        { status: 500 }
      )
    }

    // Revert user role to student
    await supabase
      .from('users')
      .update({ role: 'student' })
      .eq('id', instructorId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/instructors/[instructorId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
