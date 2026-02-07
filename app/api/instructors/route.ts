import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const InstructorProfileCreateSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().min(1),
  bio: z.string().optional(),
  profile_image_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  twitter_handle: z.string().optional(),
  expertise_areas: z.array(z.string()).default([]),
  years_of_experience: z.number().int().min(0).default(0),
  is_verified: z.boolean().default(false),
  payout_method: z.enum(['manual', 'stripe_connect']).default('manual'),
})

/**
 * GET /api/instructors
 * List all instructors (public or admin)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const verified = searchParams.get('verified')
    const supabase = await createClient()

    let query = supabase
      .from('instructor_profiles')
      .select(`
        *,
        user:id (
          email,
          role
        )
      `)

    // Filter by verified status
    if (verified === 'true') {
      query = query.eq('is_verified', true)
    }

    // Order by total students
    query = query.order('total_students', { ascending: false })

    const { data: instructors, error } = await query

    if (error) {
      console.error('Error fetching instructors:', error)
      return NextResponse.json(
        { error: 'Failed to fetch instructors' },
        { status: 500 }
      )
    }

    return NextResponse.json({ instructors })
  } catch (error) {
    console.error('Unexpected error in GET /api/instructors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/instructors
 * Create a new instructor profile (admin only)
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

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = InstructorProfileCreateSchema.parse(body)

    // Update user role to instructor
    await supabase
      .from('users')
      .update({ role: 'instructor' })
      .eq('id', validatedData.user_id)

    // Create instructor profile
    const { data: profile, error: createError } = await supabase
      .from('instructor_profiles')
      .insert({
        id: validatedData.user_id,
        display_name: validatedData.display_name,
        bio: validatedData.bio,
        profile_image_url: validatedData.profile_image_url,
        website_url: validatedData.website_url,
        linkedin_url: validatedData.linkedin_url,
        twitter_handle: validatedData.twitter_handle,
        expertise_areas: validatedData.expertise_areas,
        years_of_experience: validatedData.years_of_experience,
        is_verified: validatedData.is_verified,
        payout_method: validatedData.payout_method,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating instructor profile:', createError)
      return NextResponse.json(
        { error: 'Failed to create instructor profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/instructors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
