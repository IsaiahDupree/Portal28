"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  slug: string;
  status: string;
  role_title: string;
  revenue_share_percentage: number;
  is_primary: boolean;
  total_students: number;
  total_revenue_cents: number;
}

interface Earnings {
  total_earnings_cents: number;
  pending_cents: number;
  paid_cents: number;
  split_count: number;
}

interface InstructorProfile {
  display_name: string;
  total_courses: number;
  total_students: number;
  is_verified: boolean;
}

export default function InstructorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // Fetch instructor profile and courses
      const [profileRes, coursesRes, earningsRes] = await Promise.all([
        fetch("/api/instructors/me"),
        fetch("/api/instructors/me/courses"),
        fetch("/api/instructors/me/earnings"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.instructor);
      }

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.courses || []);
      }

      if (earningsRes.ok) {
        const data = await earningsRes.json();
        setEarnings(data.earnings);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.display_name || "Instructor"}!
        </h1>
        <p className="text-muted-foreground">
          Manage your courses and track your earnings
        </p>
        {profile?.is_verified && (
          <Badge variant="default" className="mt-2">
            Verified Instructor
          </Badge>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-8">{error}</div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((sum, c) => sum + c.total_students, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(earnings?.total_earnings_cents || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending: {formatCurrency(earnings?.pending_cents || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                courses.reduce((sum, c) => sum + c.total_revenue_cents, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gross revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Your Courses</h2>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You are not assigned to any courses yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          <Link
                            href={`/app/courses/${course.slug}`}
                            className="hover:underline"
                          >
                            {course.title}
                          </Link>
                        </h3>
                        <Badge
                          variant={
                            course.status === "published" ? "default" : "outline"
                          }
                        >
                          {course.status}
                        </Badge>
                        {course.is_primary && (
                          <Badge variant="secondary">Primary Instructor</Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {course.role_title} • {course.revenue_share_percentage}%
                        revenue share
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Students:</span>{" "}
                          <span className="font-medium">
                            {course.total_students}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Course Revenue:
                          </span>{" "}
                          <span className="font-medium">
                            {formatCurrency(course.total_revenue_cents)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Your Share:</span>{" "}
                          <span className="font-medium">
                            {formatCurrency(
                              Math.floor(
                                (course.total_revenue_cents *
                                  course.revenue_share_percentage) /
                                  100
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      className="text-sm text-blue-600 hover:underline ml-4"
                    >
                      Manage →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Earnings Details */}
      {earnings && earnings.split_count > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Earnings Breakdown</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Pending Payouts
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(earnings.pending_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Paid Out
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(earnings.paid_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-bold">{earnings.split_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
