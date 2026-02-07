"use client";

import { CohortLTVComparison } from "@/lib/db/analytics";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CohortLTVChartProps {
  cohorts: CohortLTVComparison[];
}

export function CohortLTVChart({ cohorts }: CohortLTVChartProps) {
  if (cohorts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No cohort LTV data available yet
      </div>
    );
  }

  // Transform data for recharts (convert cents to dollars)
  const chartData = cohorts.map((cohort) => ({
    cohort: cohort.cohort_date,
    "Avg LTV": ((cohort.avg_ltv || 0) / 100).toFixed(2),
    "Median LTV": ((cohort.median_ltv || 0) / 100).toFixed(2),
    "Max LTV": ((cohort.max_ltv || 0) / 100).toFixed(2),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="cohort" />
        <YAxis
          tickFormatter={(value) => `$${value}`}
          label={{ value: "Lifetime Value ($)", angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          formatter={(value) => [`$${value}`, ""]}
          labelStyle={{ color: "#000" }}
        />
        <Legend />
        <Bar dataKey="Avg LTV" fill="#3b82f6" />
        <Bar dataKey="Median LTV" fill="#8b5cf6" />
        <Bar dataKey="Max LTV" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
