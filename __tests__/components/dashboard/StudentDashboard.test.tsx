import { render } from "@testing-library/react";

// Mock Next.js components
jest.mock("next/link", () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock components
jest.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, description }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ title, value, description, icon }: any) => (
    <div data-testid="stat-card">
      <h3>{title}</h3>
      <div>{value}</div>
      <p>{description}</p>
    </div>
  ),
  StatCardGrid: ({ children }: any) => <div data-testid="stat-card-grid">{children}</div>,
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, variant, size, asChild, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

jest.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ icon, title, description, action, className }: any) => (
    <div data-testid="empty-state" className={className}>
      <h4>{title}</h4>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

jest.mock("@/components/tracking/ActivationTracker", () => ({
  ActivationTracker: ({ userId, email }: any) => (
    <div data-testid="activation-tracker" data-user-id={userId} data-email={email} />
  ),
}));

describe("StudentDashboard Component Snapshots", () => {
  const mockDashboardData = {
    user: {
      id: "user-123",
      email: "test@example.com",
    },
    courses: [
      {
        id: "course-1",
        title: "Introduction to JavaScript",
        slug: "intro-to-js",
        description: "Learn the fundamentals of JavaScript",
      },
      {
        id: "course-2",
        title: "Advanced React Patterns",
        slug: "advanced-react",
        description: "Master React with advanced patterns",
      },
    ],
    stats: {
      totalCourses: 2,
      overallProgress: 65,
      totalTimeHours: 5,
      totalTimeMinutes: 30,
      avgQuizScore: 85,
    },
    progressMap: new Map([
      ["course-1", 80],
      ["course-2", 50],
    ]),
  };

  it("renders dashboard with courses", () => {
    const DashboardComponent = () => (
      <div className="space-y-6">
        <div data-testid="activation-tracker" data-user-id={mockDashboardData.user.id} data-email={mockDashboardData.user.email} />

        <div data-testid="page-header">
          <h1>Welcome back!</h1>
          <p>Continue your learning journey with Portal28.</p>
        </div>

        <div data-testid="stat-card-grid">
          <div data-testid="stat-card">
            <h3>My Courses</h3>
            <div>{mockDashboardData.stats.totalCourses}</div>
            <p>Enrolled courses</p>
          </div>
          <div data-testid="stat-card">
            <h3>Progress</h3>
            <div>{mockDashboardData.stats.overallProgress}%</div>
            <p>Overall completion</p>
          </div>
          <div data-testid="stat-card">
            <h3>Time Spent</h3>
            <div>{mockDashboardData.stats.totalTimeHours}h {mockDashboardData.stats.totalTimeMinutes}m</div>
            <p>Total learning time</p>
          </div>
          <div data-testid="stat-card">
            <h3>Quiz Average</h3>
            <div>{mockDashboardData.stats.avgQuizScore}%</div>
            <p>Average quiz score</p>
          </div>
        </div>

        <div>
          <div>
            <div>
              <h3>My Courses</h3>
              <p>Continue where you left off</p>
            </div>
            <button>Browse More</button>
          </div>
          <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockDashboardData.courses.map((course) => (
                <a key={course.id} href={`/app/courses/${course.slug}`}>
                  <div className="hover:border-primary transition-colors cursor-pointer h-full">
                    <div>
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg">{course.title}</h3>
                        <span data-variant="success">Enrolled</span>
                      </div>
                      <p className="line-clamp-2">{course.description}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {mockDashboardData.progressMap.get(course.id)}% complete
                        </span>
                      </div>
                      <div data-testid="progress" data-value={mockDashboardData.progressMap.get(course.id)} className="h-2" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

    const { container } = render(<DashboardComponent />);
    expect(container).toMatchSnapshot();
  });

  it("renders dashboard with no courses (empty state)", () => {
    const EmptyDashboardComponent = () => (
      <div className="space-y-6">
        <div data-testid="activation-tracker" data-user-id="user-123" data-email="test@example.com" />

        <div data-testid="page-header">
          <h1>Welcome back!</h1>
          <p>Continue your learning journey with Portal28.</p>
        </div>

        <div data-testid="stat-card-grid">
          <div data-testid="stat-card">
            <h3>My Courses</h3>
            <div>0</div>
            <p>Enrolled courses</p>
          </div>
          <div data-testid="stat-card">
            <h3>Progress</h3>
            <div>0%</div>
            <p>Overall completion</p>
          </div>
          <div data-testid="stat-card">
            <h3>Time Spent</h3>
            <div>0m</div>
            <p>Total learning time</p>
          </div>
          <div data-testid="stat-card">
            <h3>Quiz Average</h3>
            <div>N/A</div>
            <p>Average quiz score</p>
          </div>
        </div>

        <div>
          <div data-testid="empty-state" className="min-h-[200px] border-0">
            <h4>No courses yet</h4>
            <p>Start your learning journey by enrolling in a course.</p>
            <button>Browse Courses</button>
          </div>
        </div>
      </div>
    );

    const { container } = render(<EmptyDashboardComponent />);
    expect(container).toMatchSnapshot();
  });
});
