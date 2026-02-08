import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = auth.user.id;

  // Fetch comprehensive dashboard metrics
  const { data: metrics, error: metricsError } = await supabase
    .from("instructor_dashboard_metrics")
    .select("*")
    .eq("instructor_id", userId);

  if (metricsError) {
    console.error("Error fetching instructor metrics:", metricsError);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }

  // Fetch revenue breakdown (last 12 months)
  const { data: revenueByMonth, error: revenueError } = await supabase
    .from("instructor_revenue_by_month")
    .select("*")
    .eq("instructor_id", userId)
    .gte("month", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("month", { ascending: true });

  if (revenueError) {
    console.error("Error fetching revenue breakdown:", revenueError);
  }

  // Fetch daily revenue (last 30 days for trends)
  const { data: revenueByDay, error: dailyError } = await supabase
    .from("instructor_revenue_by_day")
    .select("*")
    .eq("instructor_id", userId)
    .gte("day", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("day", { ascending: true });

  if (dailyError) {
    console.error("Error fetching daily revenue:", dailyError);
  }

  // Fetch student engagement
  const { data: engagement, error: engagementError } = await supabase
    .from("instructor_student_engagement")
    .select("*")
    .eq("instructor_id", userId);

  if (engagementError) {
    console.error("Error fetching engagement:", engagementError);
  }

  // Fetch course performance
  const { data: performance, error: performanceError } = await supabase
    .from("instructor_course_performance")
    .select("*")
    .eq("instructor_id", userId);

  if (performanceError) {
    console.error("Error fetching performance:", performanceError);
  }

  return NextResponse.json({
    metrics: metrics || [],
    revenueByMonth: revenueByMonth || [],
    revenueByDay: revenueByDay || [],
    engagement: engagement || [],
    performance: performance || [],
  });
}
