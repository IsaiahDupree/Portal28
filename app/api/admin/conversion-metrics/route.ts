/**
 * Conversion Metrics API
 * META-008: Conversion Optimization
 *
 * GET - Get conversion metrics and ROAS data
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start_date") ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days
  const endDate = searchParams.get("end_date") || new Date().toISOString();

  try {
    // Fetch conversion events summary
    const { data: events, error: eventsError } = await supabase
      .from("conversion_events")
      .select("event_name, value, currency, utm_campaign, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 400 });
    }

    // Calculate summary metrics
    const totalRevenue = events?.reduce((sum, e) => sum + (Number(e.value) || 0), 0) || 0;
    const totalConversions = events?.length || 0;

    // Group by event name
    const eventsByName = events?.reduce((acc: Record<string, any>, event) => {
      if (!acc[event.event_name]) {
        acc[event.event_name] = {
          name: event.event_name,
          count: 0,
          revenue: 0,
        };
      }
      acc[event.event_name].count++;
      acc[event.event_name].revenue += Number(event.value) || 0;
      return acc;
    }, {});

    // Group by campaign
    const eventsByCampaign = events
      ?.filter((e) => e.utm_campaign)
      .reduce((acc: Record<string, any>, event) => {
        const campaign = event.utm_campaign!;
        if (!acc[campaign]) {
          acc[campaign] = {
            campaign,
            count: 0,
            revenue: 0,
          };
        }
        acc[campaign].count++;
        acc[campaign].revenue += Number(event.value) || 0;
        return acc;
      }, {});

    // Fetch ad campaign performance
    const { data: campaigns, error: campaignsError } = await supabase
      .from("ad_campaign_performance")
      .select("*")
      .gte("date", startDate.split("T")[0])
      .lte("date", endDate.split("T")[0])
      .order("date", { ascending: false });

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
    }

    // Calculate overall ROAS
    const totalAdSpend = campaigns?.reduce((sum, c) => sum + Number(c.ad_spend || 0), 0) || 0;
    const overallROAS = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalConversions,
        totalAdSpend: Math.round(totalAdSpend * 100) / 100,
        overallROAS: Math.round(overallROAS * 100) / 100,
        averageOrderValue:
          totalConversions > 0
            ? Math.round((totalRevenue / totalConversions) * 100) / 100
            : 0,
      },
      eventsByName: Object.values(eventsByName || {}),
      eventsByCampaign: Object.values(eventsByCampaign || {}),
      campaigns: campaigns || [],
      dateRange: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
