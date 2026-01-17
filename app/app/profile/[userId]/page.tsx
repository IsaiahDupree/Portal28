import { supabaseServer } from "@/lib/supabase/server";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ProfilePageProps {
  params: {
    userId: string;
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = params;
  const supabase = supabaseServer();

  // Get current user (if logged in)
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === userId;

  // Get profile data
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Get user's completed courses (optional - for future enhancement)
  const { data: enrollments } = await supabase
    .from("entitlements")
    .select(`
      course_id,
      courses!inner(
        id,
        title,
        slug,
        description
      )
    `)
    .eq("user_id", userId)
    .limit(6);

  const completedCourses = enrollments?.map(e => (e.courses as any)) || [];

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage
              src={profile.avatar_url || undefined}
              alt={profile.display_name || "User"}
            />
            <AvatarFallback className="text-2xl">
              {profile.display_name ? getInitials(profile.display_name) : "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">
                {profile.display_name || "Anonymous User"}
              </h1>
              {isOwnProfile && (
                <Link href="/app/settings">
                  <Button variant="outline" size="sm">
                    Edit Profile
                  </Button>
                </Link>
              )}
            </div>

            {profile.bio && (
              <p className="text-gray-600 mt-4 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            <p className="text-sm text-gray-500 mt-4">
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Enrolled Courses (if any) */}
      {completedCourses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isOwnProfile ? "Your Courses" : "Enrolled Courses"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedCourses.map((course: any) => (
              <Link
                key={course.id}
                href={`/app/courses/${course.slug}`}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                {course.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {course.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {completedCourses.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <p className="text-gray-500">
            {isOwnProfile
              ? "You haven't enrolled in any courses yet."
              : "This user hasn't enrolled in any courses yet."}
          </p>
          {isOwnProfile && (
            <Link href="/courses" className="inline-block mt-4">
              <Button>Browse Courses</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
