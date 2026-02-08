import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateThumbnailWorkflow, STANDARD_THUMBNAIL_SIZES, ThumbnailTemplate } from "@/lib/thumbnails/generator";
import { z } from "zod";

const GenerateThumbnailSchema = z.object({
  lessonId: z.string().uuid().optional(),
  videoUrl: z.string().url().optional(),
  title: z.string().min(1).max(100),
  subtitle: z.string().max(200).optional(),
  templateId: z.string().uuid().optional(),
  frameTimestamp: z.number().min(0).optional(),
  sizes: z.array(z.enum(["youtube", "instagram", "twitter", "facebook", "linkedin"])).optional(),
});

// POST /api/admin/thumbnails/generate
// Generate thumbnails with brand styling
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = GenerateThumbnailSchema.parse(body);

    // Get template
    let template: ThumbnailTemplate;

    if (validated.templateId) {
      const { data: templateData, error: templateError } = await supabase
        .from("thumbnail_templates")
        .select("*")
        .eq("id", validated.templateId)
        .single();

      if (templateError || !templateData) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      template = templateData as ThumbnailTemplate;
    } else {
      // Use default template
      const { data: defaultTemplate } = await supabase
        .from("thumbnail_templates")
        .select("*")
        .eq("is_default", true)
        .limit(1)
        .single();

      if (!defaultTemplate) {
        return NextResponse.json({ error: "No default template found" }, { status: 500 });
      }

      template = defaultTemplate as ThumbnailTemplate;
    }

    // Determine video URL
    let videoUrl = validated.videoUrl;

    if (validated.lessonId && !videoUrl) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("video_url")
        .eq("id", validated.lessonId)
        .single();

      if (lesson?.video_url) {
        videoUrl = lesson.video_url;
      }
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl or lessonId with video_url required" },
        { status: 400 }
      );
    }

    // Create thumbnail job
    const { data: job, error: jobError } = await supabase
      .from("thumbnail_jobs")
      .insert({
        user_id: authData.user.id,
        lesson_id: validated.lessonId || null,
        video_url: videoUrl,
        template_id: template.id,
        title: validated.title,
        subtitle: validated.subtitle,
        frame_timestamp: validated.frameTimestamp || 0,
        status: "pending",
        input_params: {
          sizes: validated.sizes || ["youtube", "instagram", "twitter"],
        },
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating thumbnail job:", jobError);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // Process thumbnails (in production, this would be a background job)
    try {
      await supabase
        .from("thumbnail_jobs")
        .update({ status: "processing" })
        .eq("id", job.id);

      // Filter sizes based on request
      const requestedSizes = validated.sizes || ["youtube"];
      const sizes = STANDARD_THUMBNAIL_SIZES.filter((s) =>
        requestedSizes.includes(s.size_name as any)
      );

      // Generate thumbnails
      const thumbnails = await generateThumbnailWorkflow({
        videoUrl,
        template,
        title: validated.title,
        subtitle: validated.subtitle,
        frameTimestamp: validated.frameTimestamp,
        sizes,
      });

      // Store generated thumbnails
      const thumbnailRecords = thumbnails.map((t) => ({
        job_id: job.id,
        size_name: t.size_name,
        width: t.width,
        height: t.height,
        file_url: t.file_url,
        file_size_bytes: t.file_size_bytes,
        format: t.format,
        quality: t.quality,
      }));

      await supabase.from("generated_thumbnails").insert(thumbnailRecords);

      // Update job status
      await supabase
        .from("thumbnail_jobs")
        .update({
          status: "complete",
          output_thumbnails: thumbnails,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      // Log admin action
      await supabase.from("admin_actions").insert({
        user_id: authData.user.id,
        action: "generated_thumbnails",
        details: {
          job_id: job.id,
          title: validated.title,
          sizes: requestedSizes,
        },
      });

      return NextResponse.json({
        job_id: job.id,
        thumbnails,
        status: "complete",
      });
    } catch (genError) {
      console.error("Error generating thumbnails:", genError);

      await supabase
        .from("thumbnail_jobs")
        .update({
          status: "failed",
          error_message: genError instanceof Error ? genError.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json({ error: "Thumbnail generation failed" }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
