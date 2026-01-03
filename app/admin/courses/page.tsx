import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminCoursesPage() {
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

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, status, stripe_price_id, price_cents, created_at")
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Courses</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/admin">← Admin</Link>
          <Link
            href="/admin/courses/new"
            style={{
              backgroundColor: "#111",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14
            }}
          >
            + New Course
          </Link>
        </div>
      </div>

      {!courses || courses.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <p style={{ margin: 0, color: "#666" }}>No courses yet.</p>
          <Link href="/admin/courses/new" style={{ color: "#111", fontWeight: 500 }}>
            Create your first course →
          </Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Title</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Slug</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Price</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Status</th>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "2px solid #ddd" }}>Stripe</th>
              <th style={{ textAlign: "right", padding: 12, borderBottom: "2px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <strong>{course.title}</strong>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", color: "#666" }}>
                  /{course.slug}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  {course.price_cents ? `$${(course.price_cents / 100).toFixed(2)}` : "—"}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: course.status === "published" ? "#d4edda" : "#f8d7da",
                      color: course.status === "published" ? "#155724" : "#721c24"
                    }}
                  >
                    {course.status}
                  </span>
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", color: "#666", fontSize: 12 }}>
                  {course.stripe_price_id ? "✓ Connected" : "—"}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #eee", textAlign: "right" }}>
                  <Link
                    href={`/admin/courses/${course.id}`}
                    style={{ color: "#111", textDecoration: "underline" }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
