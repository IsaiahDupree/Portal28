import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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
    const { job_id, lesson_id, apply_chapters, apply_notes, apply_quiz } = body;

    if (!job_id) {
      return NextResponse.json({ error: "job_id is required" }, { status: 400 });
    }

    // Get the AI analysis job
    const { data: job, error: jobError } = await supabase
      .from("ai_analysis_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "AI job not found" }, { status: 404 });
    }

    const targetLessonId = lesson_id || job.lesson_id;
    if (!targetLessonId) {
      return NextResponse.json({ error: "No lesson_id specified" }, { status: 400 });
    }

    const results: Record<string, any> = {};

    // Apply chapters
    if (apply_chapters && job.chapters?.length > 0) {
      // Delete existing chapters first
      await supabase
        .from("lesson_chapters")
        .delete()
        .eq("lesson_id", targetLessonId);

      // Insert new chapters
      const chaptersToInsert = job.chapters.map((ch: any, idx: number) => ({
        lesson_id: targetLessonId,
        timestamp_seconds: ch.timestamp_seconds,
        title: ch.title,
        summary: ch.summary,
        sort_order: idx,
      }));

      const { data: chapters, error: chapterError } = await supabase
        .from("lesson_chapters")
        .insert(chaptersToInsert)
        .select();

      if (chapterError) {
        console.error("Failed to insert chapters:", chapterError);
      } else {
        results.chapters = chapters;
      }
    }

    // Apply notes
    if (apply_notes && job.notes?.length > 0) {
      const notesToInsert = job.notes.map((note: any) => ({
        lesson_id: targetLessonId,
        user_id: user.id,
        content: note.content,
        is_ai_generated: true,
        is_public: true,
      }));

      const { data: notes, error: noteError } = await supabase
        .from("lesson_notes")
        .insert(notesToInsert)
        .select();

      if (noteError) {
        console.error("Failed to insert notes:", noteError);
      } else {
        results.notes = notes;
      }
    }

    // Apply quiz
    if (apply_quiz && job.quiz_suggestions?.length > 0) {
      // Get the lesson's module to find course
      const { data: lesson } = await supabase
        .from("lessons")
        .select("module_id, modules(course_id)")
        .eq("id", targetLessonId)
        .single();

      if (lesson) {
        // Create quiz
        const { data: quiz, error: quizError } = await supabase
          .from("quizzes")
          .insert({
            lesson_id: targetLessonId,
            title: "Lesson Quiz",
            description: "Test your understanding of this lesson",
            is_ai_generated: true,
            passing_score: 70,
          })
          .select()
          .single();

        if (!quizError && quiz) {
          // Insert questions
          const questionsToInsert = job.quiz_suggestions.map((q: any, idx: number) => ({
            quiz_id: quiz.id,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            sort_order: idx,
          }));

          const { data: questions, error: qError } = await supabase
            .from("quiz_questions")
            .insert(questionsToInsert)
            .select();

          if (!qError) {
            results.quiz = { ...quiz, questions };
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      applied: results,
    });
  } catch (error: any) {
    console.error("Apply AI analysis error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
