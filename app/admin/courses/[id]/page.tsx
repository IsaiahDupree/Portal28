import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import CourseEditForm from "./CourseEditForm";
import ModulesEditor from "./ModulesEditor";
import { PreviewTokenManager } from "@/components/admin/PreviewTokenManager";

interface Props {
  params: { id: string };
}

export default async function EditCoursePage({ params }: Props) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  const { data: modules } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", params.id)
    .order("sort_order", { ascending: true });

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/admin/courses">← Back to Courses</Link>
        <Link href={`/courses/${course.slug}`} target="_blank" style={{ color: "#666" }}>
          View Public Page ↗
        </Link>
      </div>

      <h1>Edit: {course.title}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <section>
          <h2>Course Details</h2>
          <CourseEditForm course={course} />
        </section>

        <section>
          <h2>Modules & Lessons</h2>
          <ModulesEditor courseId={course.id} modules={modules || []} />
        </section>
      </div>

      <div style={{ marginTop: 32 }}>
        <PreviewTokenManager courseId={course.id} />
      </div>
    </main>
  );
}
