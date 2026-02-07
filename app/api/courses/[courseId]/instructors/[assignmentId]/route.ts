import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CourseInstructorUpdateSchema = z.object({
  role_title: z.enum(['Instructor', 'Co-Instructor', 'Teaching Assistant']).optional(),
  revenue_share_percentage: z.number().min(0).max(100).optional(),
  is_primary: z.boolean().optional(),
  permissions: z.object({
    can_edit_content: z.boolean(),
    can_manage_students: z.boolean(),
    can_view_analytics: z.boolean(),
    can_manage_pricing: z.boolean(),
  }).optional(),
  bio: z.string().optional(),
})

/**
 * PATCH /api/courses/[courseId]/instructors/[assignmentId]
 * Update instructor assignment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  try {
    const { courseId, assignmentId } = await params
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
    const validatedData = CourseInstructorUpdateSchema.parse(body)

    // If setting as primary, unset other primary instructors
    if (validatedData.is_primary) {
      await supabase
        .from('course_instructors')
        .update({ is_primary: false })
        .eq('course_id', courseId)
    }

    // If updating revenue share, validate total doesn't exceed 100%
    if (validatedData.revenue_share_percentage !== undefined) {
      const { data: currentAssignment } = await supabase
        .from('course_instructors')
        .select('revenue_share_percentage')
        .eq('id', assignmentId)
        .single()

      const { data: otherInstructors } = await supabase
        .from('course_instructors')
        .select('revenue_share_percentage')
        .eq('course_id', courseId)
        .neq('id', assignmentId)

      const currentShare = Number(currentAssignment?.revenue_share_percentage || 0)
      const otherShare = (otherInstructors || [])
        .reduce((sum, i) => sum + Number(i.revenue_share_percentage), 0)

      if (otherShare + validatedData.revenue_share_percentage > 100) {
        return NextResponse.json(
          {
            error: `Total revenue share would exceed 100% (other instructors: ${otherShare}%, setting: ${validatedData.revenue_share_percentage}%)`,
          },
          { status: 400 }
        )
      }
    }

    // Update assignment
    const { data: assignment, error: updateError } = await supabase
      .from('course_instructors')
      .update(validatedData)
      .eq('id', assignmentId)
      .eq('course_id', courseId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating instructor assignment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update instructor assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/courses/[courseId]/instructors/[assignmentId]
 * Remove instructor from course
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  try {
    const { courseId, assignmentId } = await params
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

    // Delete assignment
    const { error: deleteError } = await supabase
      .from('course_instructors')
      .delete()
      .eq('id', assignmentId)
      .eq('course_id', courseId)

    if (deleteError) {
      console.error('Error deleting instructor assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete instructor assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
