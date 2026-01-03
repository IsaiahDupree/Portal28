import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getCourseBySlug, getCourseOutline } from "@/lib/db/queries";
import { userHasCourseAccess } from "@/lib/entitlements/hasAccess";

export default async function CourseOutlinePage({ params }: { params: { slug: string } }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user!;

  const course = await getCourseBySlug(params.slug);
  if (!course) {
    return (
      <main>
        <h1>Not found</h1>
      </main>
    );
  }

  const ok = await userHasCourseAccess(user.id, course.id);
  if (!ok) {
    return (
      <main>
        <h1>Access required</h1>
        <p>You don't have access to this course.</p>
        <Link href={`/courses/${course.slug}`}>Go to sales page →</Link>
      </main>
    );
  }

  const outline = await getCourseOutline(course.id);

  return (
    <main>
      <Link href="/app">← Back</Link>
      <h1 style={{ marginTop: 10 }}>{course.title}</h1>

      {outline.map((m) => (
        <div key={m.id} style={{ marginTop: 18 }}>
          <h3>{m.title}</h3>
          <ul style={{ paddingLeft: 18 }}>
            {m.lessons.map((l) => (
              <li key={l.id}>
                <Link href={`/app/lesson/${l.id}`}>{l.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </main>
  );
}
