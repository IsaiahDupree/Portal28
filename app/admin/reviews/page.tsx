import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewModerationList } from "./ReviewModerationList";

export default async function ReviewsModeration Page() {
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

  // Fetch pending reviews
  const { data: pendingReviews } = await supabase
    .from("course_reviews")
    .select(`
      *,
      user_metadata!inner(name),
      courses!inner(title)
    `)
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: false });

  // Fetch recent moderated reviews
  const { data: moderatedReviews } = await supabase
    .from("course_reviews")
    .select(`
      *,
      user_metadata!inner(name),
      courses!inner(title)
    `)
    .in("moderation_status", ["approved", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(20);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Review Moderation
        </h1>
        <p className="text-gray-600">
          Review and moderate course reviews submitted by students
        </p>
      </div>

      <ReviewModerationList
        pendingReviews={pendingReviews || []}
        moderatedReviews={moderatedReviews || []}
      />
    </div>
  );
}
