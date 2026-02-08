import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function checkAdmin(supabase: ReturnType<typeof supabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

// POST - Clone a course
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const user = await checkAdmin(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    include_chapters = true,
    include_lessons = true,
    include_prices = false
  } = body;

  // Get original course
  const { data: originalCourse, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", params.id)
    .single();

  if (courseError || !originalCourse) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  try {
    // Clone course
    const clonedCourse: any = {
      ...originalCourse,
      name: name || `${originalCourse.name} (Copy)`,
      slug: `${originalCourse.slug}-copy-${Date.now()}`,
      status: "draft",
      created_by: user.id
    };

    delete clonedCourse.id;
    delete clonedCourse.created_at;
    delete clonedCourse.updated_at;

    const { data: newCourse, error: insertError } = await supabaseAdmin
      .from("courses")
      .insert(clonedCourse)
      .select()
      .single();

    if (insertError || !newCourse) {
      return NextResponse.json(
        { error: `Failed to clone course: ${insertError?.message}` },
        { status: 500 }
      );
    }

    let chaptersCloned = 0;
    let lessonsCloned = 0;

    // Clone chapters and lessons if requested
    if (include_chapters) {
      const { data: chapters } = await supabaseAdmin
        .from("chapters")
        .select("*")
        .eq("course_id", params.id)
        .order("order_index");

      if (chapters && chapters.length > 0) {
        for (const chapter of chapters) {
          const clonedChapter: any = {
            ...chapter,
            course_id: newCourse.id
          };
          delete clonedChapter.id;
          delete clonedChapter.created_at;
          delete clonedChapter.updated_at;

          const { data: newChapter } = await supabaseAdmin
            .from("chapters")
            .insert(clonedChapter)
            .select()
            .single();

          chaptersCloned++;

          if (include_lessons && newChapter) {
            const { data: lessons } = await supabaseAdmin
              .from("lessons")
              .select("*")
              .eq("chapter_id", chapter.id)
              .order("order_index");

            if (lessons && lessons.length > 0) {
              for (const lesson of lessons) {
                const clonedLesson: any = {
                  ...lesson,
                  chapter_id: newChapter.id,
                  course_id: newCourse.id
                };
                delete clonedLesson.id;
                delete clonedLesson.created_at;
                delete clonedLesson.updated_at;

                await supabaseAdmin
                  .from("lessons")
                  .insert(clonedLesson);

                lessonsCloned++;
              }
            }
          }
        }
      }
    }

    // Clone prices if requested
    if (include_prices) {
      const { data: prices } = await supabaseAdmin
        .from("course_prices")
        .select("*")
        .eq("course_id", params.id);

      if (prices && prices.length > 0) {
        for (const price of prices) {
          const clonedPrice: any = {
            ...price,
            course_id: newCourse.id,
            is_active: false // Make inactive by default
          };
          delete clonedPrice.id;
          delete clonedPrice.created_at;
          delete clonedPrice.updated_at;

          await supabaseAdmin
            .from("course_prices")
            .insert(clonedPrice);
        }
      }
    }

    return NextResponse.json({
      success: true,
      course: newCourse,
      stats: {
        chapters_cloned: chaptersCloned,
        lessons_cloned: lessonsCloned
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to clone course: ${error.message}` },
      { status: 500 }
    );
  }
}
