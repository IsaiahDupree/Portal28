import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CourseInstructorAssignSchema = z.object({
  instructor_id: z.string().uuid(),
  role_title: z.enum(['Instructor', 'Co-Instructor', 'Teaching Assistant']).default('Instructor'),
  revenue_share_percentage: z.number().min(0).max(100).default(0),
  is_primary: z.boolean().default(false),
  permissions: z.object({
    can_edit_content: z.boolean().default(true),
    can_manage_students: z.boolean().default(true),
    can_view_analytics: z.boolean().default(true),
    can_manage_pricing: z.boolean().default(false),
  }).optional(),
  bio: z.string().optional(),
})

/**
 * GET /api/courses/[courseId]/instructors
 * Get all instructors for a course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const supabase = await createClient()

    const { data: instructors, error } = await supabase
      .from('course_instructors')
      .select(`
        *,
        instructor:instructor_id (
          id,
          email,
          role
        ),
        instructor_profile:instructor_profiles!instructor_id (
          display_name,
          profile_image_url,
          bio
        )
      `)
      .eq('course_id', courseId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching course instructors:', error)
      return NextResponse.json(
        { error: 'Failed to fetch course instructors' },
        { status: 500 }
      )
    }

    return NextResponse.json({ instructors })
  } catch (error) {
    console.error('Unexpected error in GET /api/courses/[courseId]/instructors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/courses/[courseId]/instructors
 * Assign an instructor to a course (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
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

    const body = await request.json()
    const validatedData = CourseInstructorAssignSchema.parse(body)

    // Verify instructor exists and has instructor role
    const { data: instructor } = await supabase
      .from('users')
      .select('role')
      .eq('id', validatedData.instructor_id)
      .single()

    if (!instructor || instructor.role !== 'instructor') {
      return NextResponse.json(
        { error: 'User must have instructor role' },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primary instructors
    if (validatedData.is_primary) {
      await supabase
        .from('course_instructors')
        .update({ is_primary: false })
        .eq('course_id', courseId)
    }

    // Validate total revenue share doesn't exceed 100%
    const { data: existingInstructors } = await supabase
      .from('course_instructors')
      .select('revenue_share_percentage')
      .eq('course_id', courseId)

    const totalShare = (existingInstructors || [])
      .reduce((sum, i) => sum + Number(i.revenue_share_percentage), 0)

    if (totalShare + validatedData.revenue_share_percentage > 100) {
      return NextResponse.json(
        {
          error: `Total revenue share would exceed 100% (current: ${totalShare}%, adding: ${validatedData.revenue_share_percentage}%)`,
        },
        { status: 400 }
      )
    }

    // Assign instructor to course
    const { data: assignment, error: createError } = await supabase
      .from('course_instructors')
      .insert({
        course_id: courseId,
        instructor_id: validatedData.instructor_id,
        role_title: validatedData.role_title,
        revenue_share_percentage: validatedData.revenue_share_percentage,
        is_primary: validatedData.is_primary,
        permissions: validatedData.permissions,
        bio: validatedData.bio,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error assigning instructor:', createError)
      return NextResponse.json(
        { error: 'Failed to assign instructor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/courses/[courseId]/instructors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
