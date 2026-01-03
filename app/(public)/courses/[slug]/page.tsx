import Link from "next/link";
import { getCourseBySlug } from "@/lib/db/queries";
import { BuyButton } from "./BuyButton";

export default async function CourseSalesPage({ params }: { params: { slug: string } }) {
  const course = await getCourseBySlug(params.slug);
  if (!course || course.status !== "published") {
    return (
      <main>
        <h1>Course not found</h1>
        <Link href="/courses">← Back</Link>
      </main>
    );
  }

  return (
    <main>
      <Link href="/courses">← All courses</Link>
      <h1 style={{ marginTop: 10 }}>{course.title}</h1>
      {course.description ? <p>{course.description}</p> : null}

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <BuyButton courseId={course.id} />
        <Link href="/login" style={{ opacity: 0.8 }}>
          Already bought? Login →
        </Link>
      </div>

      <hr style={{ margin: "24px 0" }} />
      <h3>What you'll learn</h3>
      <ul>
        <li>Facebook ads fundamentals (and what actually matters)</li>
        <li>Creative + funnel alignment</li>
        <li>Scaling with clean tracking</li>
      </ul>
    </main>
  );
}
