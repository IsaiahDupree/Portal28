"use client";

import { CohortAnalytics } from "@/lib/db/analytics";

interface CohortRetentionTableProps {
  cohorts: CohortAnalytics[];
  period: "week" | "month";
}

export function CohortRetentionTable({
  cohorts,
  period,
}: CohortRetentionTableProps) {
  if (cohorts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No cohort data available yet. Users will be grouped by their signup {period}.
      </div>
    );
  }

  // Helper to format retention percentage with color coding
  const formatRetention = (rate: number) => {
    const percentage = rate.toFixed(1);
    let colorClass = "text-muted-foreground";

    if (rate >= 50) {
      colorClass = "text-green-600 font-semibold";
    } else if (rate >= 25) {
      colorClass = "text-yellow-600 font-medium";
    } else if (rate > 0) {
      colorClass = "text-orange-600";
    }

    return <span className={colorClass}>{percentage}%</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3 font-medium sticky left-0 bg-muted">
              Cohort
            </th>
            <th className="text-right p-3 font-medium">Size</th>
            <th className="text-right p-3 font-medium">Revenue</th>
            <th className="text-right p-3 font-medium">Avg LTV</th>
            <th className="text-right p-3 font-medium">Week 1</th>
            <th className="text-right p-3 font-medium">Week 2</th>
            <th className="text-right p-3 font-medium">Week 4</th>
            <th className="text-right p-3 font-medium">Week 8</th>
            <th className="text-right p-3 font-medium">Week 12</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.cohort_date} className="border-t hover:bg-muted/50">
              <td className="p-3 font-medium sticky left-0 bg-background">
                {cohort.cohort_date}
              </td>
              <td className="p-3 text-right">{cohort.cohort_size}</td>
              <td className="p-3 text-right">
                ${((cohort.total_revenue || 0) / 100).toFixed(2)}
              </td>
              <td className="p-3 text-right">
                ${((cohort.avg_ltv || 0) / 100).toFixed(2)}
              </td>
              <td className="p-3 text-right">
                {formatRetention(cohort.retention_week_1)}
              </td>
              <td className="p-3 text-right">
                {formatRetention(cohort.retention_week_2)}
              </td>
              <td className="p-3 text-right">
                {formatRetention(cohort.retention_week_4)}
              </td>
              <td className="p-3 text-right">
                {formatRetention(cohort.retention_week_8)}
              </td>
              <td className="p-3 text-right">
                {formatRetention(cohort.retention_week_12)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
