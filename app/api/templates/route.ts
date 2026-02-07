import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const TemplateCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['general', 'design', 'code', 'business', 'marketing', 'other']).default('general'),
  file_url: z.string().url().optional(),
  file_name: z.string().optional(),
  file_size_bytes: z.number().int().min(0).optional(),
  file_type: z.string().optional(),
  preview_url: z.string().url().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).default([]),
  is_published: z.boolean().default(true),
  is_premium: z.boolean().default(false),
  required_product_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.any()).optional(),
})

const TemplateUpdateSchema = TemplateCreateSchema.partial()

/**
 * GET /api/templates
 * List published templates
 * Query params: category, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Use database function for access-controlled template list
    const { data: templates, error } = await supabase.rpc(
      'get_published_templates',
      {
        filter_category: category || null,
        limit_count: limit,
        offset_count: offset,
      }
    )

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Create a new template (admin only)
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
    const validatedData = TemplateCreateSchema.parse(body)

    // Ensure at least file_url or content is provided
    if (!validatedData.file_url && !validatedData.content) {
      return NextResponse.json(
        { error: 'Either file_url or content must be provided' },
        { status: 400 }
      )
    }

    // Create template
    const { data: template, error: createError } = await supabase
      .from('templates')
      .insert({
        ...validatedData,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating template:', createError)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
