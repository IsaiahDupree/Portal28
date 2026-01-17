"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenueDataPoint } from "@/lib/db/analytics";

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Transform data for recharts
  const chartData = data.map((d) => ({
    date: d.date,
    revenue: Number(d.revenue) / 100, // Convert cents to dollars
    orders: Number(d.orders),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs text-muted-foreground"
            tickLine={false}
          />
          <YAxis
            className="text-xs text-muted-foreground"
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <div className="text-sm font-medium">{payload[0].payload.date}</div>
                    <div className="mt-1 flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground">
                        Revenue: ${payload[0].payload.revenue.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Orders: {payload[0].payload.orders}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
