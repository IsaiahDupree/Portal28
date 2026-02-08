"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, TrendingUp, Users, Award } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RevenueDataPoint {
  month?: string;
  day?: string;
  course_title: string;
  total_revenue_cents: number;
  instructor_share_cents: number;
  order_count: number;
}

interface EngagementData {
  course_title: string;
  total_students: number;
  active_students_30d: number;
  active_students_7d: number;
  inactive_students: number;
  active_percentage: number;
}

interface PerformanceData {
  course_title: string;
  total_enrollments: number;
  avg_completion_percent: number;
  students_completed: number;
  students_in_progress: number;
  students_not_started: number;
  completion_rate: number;
  avg_time_spent_seconds: number;
  avg_quiz_score: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function InstructorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenueDataPoint[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDataPoint[]>([]);
  const [engagement, setEngagement] = useState<EngagementData[]>([]);
  const [performance, setPerformance] = useState<PerformanceData[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const res = await fetch("/api/instructors/me/analytics");

      if (res.ok) {
        const data = await res.json();
        setRevenueByMonth(data.revenueByMonth || []);
        setRevenueByDay(data.revenueByDay || []);
        setEngagement(data.engagement || []);
        setPerformance(data.performance || []);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  // Prepare chart data
  const monthlyRevenue = revenueByMonth.map((d) => ({
    month: new Date(d.month!).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
    revenue: d.instructor_share_cents / 100,
    orders: d.order_count,
  }));

  const dailyRevenue = revenueByDay.slice(-30).map((d) => ({
    date: new Date(d.day!).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: d.instructor_share_cents / 100,
  }));

  // Aggregate engagement data for pie chart
  const totalEngagement = engagement.reduce(
    (acc, e) => {
      acc.active += e.active_students_30d;
      acc.inactive += e.inactive_students;
      return acc;
    },
    { active: 0, inactive: 0 }
  );

  const engagementChartData = [
    { name: "Active (30d)", value: totalEngagement.active },
    { name: "Inactive", value: totalEngagement.inactive },
  ];

  // Performance metrics
  const performanceChartData = performance.map((p) => ({
    course: p.course_title.substring(0, 20) + (p.course_title.length > 20 ? "..." : ""),
    completed: p.students_completed,
    inProgress: p.students_in_progress,
    notStarted: p.students_not_started,
    completionRate: p.completion_rate,
  }));

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Instructor Analytics</h1>
        <p className="text-muted-foreground">
          Track your revenue, student engagement, and course performance
        </p>
      </div>

      {/* Revenue Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Breakdown (Last 12 Months)
          </CardTitle>
          <CardDescription>Your earnings over time</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: "#000" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">No revenue data available</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Daily Revenue (Last 30 Days)
          </CardTitle>
          <CardDescription>Recent revenue trends</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: "#000" }}
                />
                <Bar dataKey="revenue" fill="#00C49F" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">No recent revenue data</p>
          )}
        </CardContent>
      </Card>

      {/* Student Engagement */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Engagement
            </CardTitle>
            <CardDescription>Active vs inactive students</CardDescription>
          </CardHeader>
          <CardContent>
            {engagementChartData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={engagementChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {engagementChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">No student data available</p>
            )}
          </CardContent>
        </Card>

        {/* Course Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Course Performance
            </CardTitle>
            <CardDescription>Completion rates and quiz scores</CardDescription>
          </CardHeader>
          <CardContent>
            {performance.length > 0 ? (
              <div className="space-y-4">
                {performance.map((p, idx) => (
                  <div key={idx} className="border-b pb-3 last:border-0">
                    <h4 className="font-medium text-sm mb-2">{p.course_title}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Completion:</span>{" "}
                        <span className="font-medium">{p.completion_rate?.toFixed(1) || 0}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Quiz:</span>{" "}
                        <span className="font-medium">{p.avg_quiz_score?.toFixed(1) || "N/A"}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>{" "}
                        <span className="font-medium">{p.students_completed}/{p.total_enrollments}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Time:</span>{" "}
                        <span className="font-medium">
                          {p.avg_time_spent_seconds ? formatTime(p.avg_time_spent_seconds) : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-10">No performance data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Breakdown by Course */}
      <Card>
        <CardHeader>
          <CardTitle>Student Progress by Course</CardTitle>
          <CardDescription>Breakdown of student completion status</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="course" />
                <YAxis />
                <Tooltip labelStyle={{ color: "#000" }} />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#00C49F" name="Completed" />
                <Bar dataKey="inProgress" stackId="a" fill="#FFBB28" name="In Progress" />
                <Bar dataKey="notStarted" stackId="a" fill="#FF8042" name="Not Started" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">No student progress data</p>
          )}
        </CardContent>
      </Card>

      {/* Detailed Engagement Per Course */}
      <Card>
        <CardHeader>
          <CardTitle>Student Engagement by Course</CardTitle>
          <CardDescription>Active vs inactive students per course</CardDescription>
        </CardHeader>
        <CardContent>
          {engagement.length > 0 ? (
            <div className="space-y-4">
              {engagement.map((e, idx) => (
                <div key={idx} className="border-b pb-4 last:border-0">
                  <h4 className="font-medium mb-2">{e.course_title}</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Students</p>
                      <p className="text-2xl font-bold">{e.total_students}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Active (30d)</p>
                      <p className="text-2xl font-bold text-green-600">{e.active_students_30d}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Inactive</p>
                      <p className="text-2xl font-bold text-orange-600">{e.inactive_students}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Active %</p>
                      <p className="text-2xl font-bold">{e.active_percentage?.toFixed(1) || 0}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">No engagement data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
