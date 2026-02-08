import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/admin/ab-tests/[id]/metrics
 * Calculates and updates metrics for an A/B test
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Call the database function to calculate metrics
    const { error } = await supabaseAdmin.rpc("calculate_ab_test_metrics", {
      test_id_param: params.id
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch the updated metrics
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .from("ab_test_metrics")
      .select(`
        *,
        variant:ab_test_variants(*)
      `)
      .eq("test_id", params.id);

    if (metricsError) {
      return NextResponse.json({ error: metricsError.message }, { status: 500 });
    }

    // Calculate statistical significance between variants
    // For simplicity, we'll use a basic Z-test for proportions
    const controlMetric = metrics.find(m => m.variant?.is_control);
    const treatmentMetrics = metrics.filter(m => !m.variant?.is_control);

    if (controlMetric && treatmentMetrics.length > 0) {
      for (const treatment of treatmentMetrics) {
        const significance = calculateSignificance(
          controlMetric.conversions,
          controlMetric.impressions,
          treatment.conversions,
          treatment.impressions
        );

        // Update the metric with significance
        await supabaseAdmin
          .from("ab_test_metrics")
          .update({
            p_value: significance.pValue,
            confidence_level: significance.confidence,
            is_significant: significance.isSignificant
          })
          .eq("id", treatment.id);
      }
    }

    // Fetch final metrics
    const { data: finalMetrics } = await supabaseAdmin
      .from("ab_test_metrics")
      .select(`
        *,
        variant:ab_test_variants(*)
      `)
      .eq("test_id", params.id);

    return NextResponse.json({ metrics: finalMetrics });

  } catch (error) {
    console.error("Error calculating metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Calculate statistical significance using Z-test for proportions
 */
function calculateSignificance(
  controlConversions: number,
  controlImpressions: number,
  treatmentConversions: number,
  treatmentImpressions: number
): { pValue: number; confidence: number; isSignificant: boolean } {
  // Minimum sample size for valid test
  if (controlImpressions < 100 || treatmentImpressions < 100) {
    return { pValue: 1, confidence: 0, isSignificant: false };
  }

  const p1 = controlConversions / controlImpressions;
  const p2 = treatmentConversions / treatmentImpressions;

  // Pooled proportion
  const pPool = (controlConversions + treatmentConversions) / (controlImpressions + treatmentImpressions);

  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / controlImpressions + 1 / treatmentImpressions));

  // Z-score
  const z = Math.abs(p2 - p1) / se;

  // P-value (two-tailed test)
  const pValue = 2 * (1 - normalCDF(z));

  // Confidence level
  const confidence = (1 - pValue) * 100;

  // Is significant at 95% confidence level
  const isSignificant = pValue < 0.05;

  return {
    pValue: Math.min(pValue, 1), // Cap at 1
    confidence: Math.min(confidence, 99.99), // Cap at 99.99
    isSignificant
  };
}

/**
 * Normal cumulative distribution function (approximation)
 */
function normalCDF(z: number): number {
  // Using the error function approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return z > 0 ? 1 - probability : probability;
}
