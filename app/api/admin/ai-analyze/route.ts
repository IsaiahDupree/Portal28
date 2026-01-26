import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { analyzeVideoContent, AnalysisResult } from "@/lib/ai/analyze-video";

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || !["admin", "teacher"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { lesson_id, course_id, transcription, video_duration_seconds } = body;

    if (!transcription) {
      return NextResponse.json({ error: "Transcription is required" }, { status: 400 });
    }

    // Create AI analysis job
    const { data: job, error: jobError } = await supabase
      .from("ai_analysis_jobs")
      .insert({
        lesson_id,
        course_id,
        status: "analyzing",
        transcription,
        created_by: user.id,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create AI job:", jobError);
      return NextResponse.json({ error: "Failed to create analysis job" }, { status: 500 });
    }

    // Run AI analysis
    try {
      const result = await analyzeVideoContent(transcription, video_duration_seconds);

      // Update job with results
      await supabase
        .from("ai_analysis_jobs")
        .update({
          status: "complete",
          chapters: result.chapters,
          notes: result.notes,
          quiz_suggestions: result.quiz_suggestions,
          key_points: result.key_points,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json({
        success: true,
        job_id: job.id,
        result,
      });
    } catch (aiError: any) {
      // Update job with error
      await supabase
        .from("ai_analysis_jobs")
        .update({
          status: "failed",
          error_message: aiError.message,
        })
        .eq("id", job.id);

      return NextResponse.json({ 
        error: "AI analysis failed", 
        details: aiError.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI analyze error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");
    const lessonId = searchParams.get("lesson_id");

    let query = supabase.from("ai_analysis_jobs").select("*");

    if (jobId) {
      query = query.eq("id", jobId);
    } else if (lessonId) {
      query = query.eq("lesson_id", lessonId);
    }

    const { data: jobs, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
