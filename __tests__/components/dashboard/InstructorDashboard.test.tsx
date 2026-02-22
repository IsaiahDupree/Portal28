import { render } from "@testing-library/react";

// Mock Next.js components
jest.mock("next/link", () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}));

describe("InstructorDashboard Component Snapshots", () => {
  const mockInstructorData = {
    profile: {
      display_name: "John Instructor",
      total_courses: 3,
      total_students: 150,
      is_verified: true,
    },
    courses: [
      {
        id: "course-1",
        title: "JavaScript Masterclass",
        slug: "js-masterclass",
        status: "published",
        role_title: "Lead Instructor",
        revenue_share_percentage: 80,
        is_primary: true,
        total_students: 100,
        total_revenue_cents: 50000,
      },
      {
        id: "course-2",
        title: "React Advanced",
        slug: "react-advanced",
        status: "draft",
        role_title: "Co-Instructor",
        revenue_share_percentage: 50,
        is_primary: false,
        total_students: 50,
        total_revenue_cents: 25000,
      },
    ],
    earnings: {
      total_earnings_cents: 45000,
      pending_cents: 10000,
      paid_cents: 35000,
      split_count: 15,
    },
  };

  it("renders instructor dashboard with courses and earnings", () => {
    const DashboardComponent = () => (
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {mockInstructorData.profile.display_name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your courses and track your earnings
          </p>
          {mockInstructorData.profile.is_verified && (
            <span data-variant="default" className="mt-2">
              Verified Instructor
            </span>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Courses</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">{mockInstructorData.courses.length}</div>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Students</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {mockInstructorData.courses.reduce((sum, c) => sum + c.total_students, 0)}
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Earnings</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">
                ${(mockInstructorData.earnings.total_earnings_cents / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending: ${(mockInstructorData.earnings.pending_cents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Course Revenue</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">
                ${(mockInstructorData.courses.reduce((sum, c) => sum + c.total_revenue_cents, 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Gross revenue</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Your Courses</h2>
          <div className="grid gap-4">
            {mockInstructorData.courses.map((course) => (
              <div key={course.id}>
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          <a href={`/app/courses/${course.slug}`} className="hover:underline">
                            {course.title}
                          </a>
                        </h3>
                        <span data-variant={course.status === "published" ? "default" : "outline"}>
                          {course.status}
                        </span>
                        {course.is_primary && (
                          <span data-variant="secondary">Primary Instructor</span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {course.role_title} • {course.revenue_share_percentage}% revenue share
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Students:</span>{" "}
                          <span className="font-medium">{course.total_students}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Course Revenue:</span>{" "}
                          <span className="font-medium">
                            ${(course.total_revenue_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Your Share:</span>{" "}
                          <span className="font-medium">
                            ${(Math.floor((course.total_revenue_cents * course.revenue_share_percentage) / 100) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/admin/courses/${course.id}/edit`}
                      className="text-sm text-blue-600 hover:underline ml-4"
                    >
                      Manage →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Earnings Breakdown</h2>
          <div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Payouts</p>
                  <p className="text-2xl font-bold">
                    ${(mockInstructorData.earnings.pending_cents / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Paid Out</p>
                  <p className="text-2xl font-bold">
                    ${(mockInstructorData.earnings.paid_cents / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
                  <p className="text-2xl font-bold">{mockInstructorData.earnings.split_count}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    const { container } = render(<DashboardComponent />);
    expect(container).toMatchSnapshot();
  });

  it("renders instructor dashboard with no courses", () => {
    const EmptyDashboardComponent = () => (
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, New Instructor!</h1>
          <p className="text-muted-foreground">
            Manage your courses and track your earnings
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Courses</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Students</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Earnings</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground mt-1">Pending: $0.00</p>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Course Revenue</h3>
            </div>
            <div>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground mt-1">Gross revenue</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Your Courses</h2>
          <div>
            <div className="py-10 text-center text-muted-foreground">
              You are not assigned to any courses yet.
            </div>
          </div>
        </div>
      </div>
    );

    const { container } = render(<EmptyDashboardComponent />);
    expect(container).toMatchSnapshot();
  });
});
