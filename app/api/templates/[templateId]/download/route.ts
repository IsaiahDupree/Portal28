import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trackTemplateDownload } from '@/lib/tracking/server'

const DownloadSchema = z.object({
  type: z.enum(['download', 'copy']).default('download'),
})

/**
 * POST /api/templates/[templateId]/download
 * Record a template download or copy action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = DownloadSchema.parse(body)

    // Get user agent from headers
    const userAgent = request.headers.get('user-agent') || undefined

    // Use the database function to record download and check access
    const { data: downloadId, error } = await supabase.rpc(
      'record_template_download',
      {
        p_template_id: templateId,
        p_download_type: type,
        p_user_agent: userAgent,
      }
    )

    if (error) {
      console.error('Error recording template download:', error)

      // Check if it's an access denied error
      if (error.message?.includes('Access denied')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }

      if (error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to record download' },
        { status: 500 }
      )
    }

    // Get the template data for the response
    const { data: template } = await supabase
      .from('templates')
      .select('file_url, file_name, content')
      .eq('id', templateId)
      .single()

    // TRACK-004: Track template download
    if (template?.file_name) {
      await trackTemplateDownload({
        templateId,
        fileName: template.file_name,
        userId: user.id,
      })
    }

    return NextResponse.json({
      success: true,
      download_id: downloadId,
      file_url: template?.file_url,
      file_name: template?.file_name,
      content: type === 'copy' ? template?.content : undefined,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/templates/[templateId]/download:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
