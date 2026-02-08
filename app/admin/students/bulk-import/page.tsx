import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BulkImportForm } from "./BulkImportForm";

export default async function BulkImportPage() {
  const supabase = supabaseServer();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check admin role
  const { data: metadata } = await supabase
    .from("user_metadata")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (metadata?.role !== "admin") {
    redirect("/app");
  }

  // Fetch courses for reference
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bulk Student Import
        </h1>
        <p className="text-gray-600">
          Upload a CSV file to bulk import students and grant course access
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          CSV Format
        </h2>
        <p className="text-gray-600 mb-3">
          Your CSV file should have the following columns:
        </p>
        <div className="bg-gray-50 rounded p-4 mb-4">
          <code className="text-sm text-gray-800">
            email,name,course_id
            <br />
            student@example.com,John Doe,uuid-of-course
            <br />
            another@example.com,Jane Smith,uuid-of-course
          </code>
        </div>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>
            <strong>email:</strong> Student email address (required, must be valid email)
          </li>
          <li>
            <strong>name:</strong> Student full name (required)
          </li>
          <li>
            <strong>course_id:</strong> UUID of the course to grant access to (required)
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Courses
        </h2>
        {courses && courses.length > 0 ? (
          <div className="space-y-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              >
                <span className="text-gray-900">{course.title}</span>
                <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                  {course.id}
                </code>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No courses available</p>
        )}
      </div>

      <BulkImportForm />
    </div>
  );
}
