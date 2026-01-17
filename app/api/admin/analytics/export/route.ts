import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getRevenueTimeSeries,
  getTopCourses,
  getOfferAnalytics,
} from "@/lib/db/analytics";

/**
 * GET /api/admin/analytics/export
 * Export analytics data as CSV
 */
export async function GET(request: Request) {
  const supabase = supabaseServer();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get query params
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30");

  try {
    // Fetch analytics data
    const [revenueData, topCourses, offerAnalytics] = await Promise.all([
      getRevenueTimeSeries("day", days),
      getTopCourses(100),
      getOfferAnalytics(days),
    ]);

    // Build CSV
    let csv = "";

    // Revenue section
    csv += "Revenue Over Time\n";
    csv += "Date,Revenue,Orders\n";
    revenueData.forEach((row) => {
      csv += `${row.date},${Number(row.revenue) / 100},${row.orders}\n`;
    });
    csv += "\n";

    // Top courses section
    csv += "Top Courses by Revenue\n";
    csv += "Title,Slug,Revenue,Orders\n";
    topCourses.forEach((course) => {
      csv += `"${course.title}",${course.slug},${Number(course.revenue) / 100},${course.orders}\n`;
    });
    csv += "\n";

    // Offer analytics section
    csv += "Offer Performance\n";
    csv += "Offer Key,Offer Title,Impressions,Checkouts,Conversions,Conversion Rate\n";
    offerAnalytics.forEach((offer) => {
      csv += `${offer.offer_key},"${offer.offer_title}",${offer.impressions},${offer.checkouts},${offer.conversions},${offer.conversion_rate}\n`;
    });

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="analytics-${days}d-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
