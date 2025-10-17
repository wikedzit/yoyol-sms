import type { Route } from './+types/home';
import StatCard from '~/Dahsboard/statCard';
import { BarChart3, BookOpen, GraduationCap, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import AppSidebar from '~/Dahsboard/sidebar';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'YOYOL-student management system' },
    {
      name: 'description',
      content: 'Welcome to YOYOL-student management system!',
    },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <main className="flex-1">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>

          {/* Stats Section */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Students"
              value="2,847"
              change="+12.5%"
              icon={Users}
            />
            <StatCard
              title="Active Courses"
              value="48"
              change="+3"
              icon={BookOpen}
            />
            <StatCard
              title="Avg. Attendance"
              value="92.4%"
              change="+2.1%"
              icon={BarChart3}
            />
            <StatCard
              title="Graduates"
              value="342"
              change="+18"
              icon={GraduationCap}
            />
          </div>

          {/* Example Cards Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-none">
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      New student enrollment
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sarah Johnson enrolled in Computer Science
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      2 hours ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-accent mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Course completion</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Michael Chen completed Advanced Mathematics
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      5 hours ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-chart-3 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Grade submission</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Prof. Anderson submitted grades for Physics 101
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      1 day ago
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-none">
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[60px]">
                    <span className="text-2xl font-bold text-primary">15</span>
                    <span className="text-xs text-muted-foreground">MAR</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Spring Semester Finals
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All departments
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex flex-col items-center justify-center bg-accent/10 rounded-lg p-2 min-w-[60px]">
                    <span className="text-2xl font-bold text-accent">22</span>
                    <span className="text-xs text-muted-foreground">MAR</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Parent-Teacher Conference
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Main auditorium
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex flex-col items-center justify-center bg-chart-3/10 rounded-lg p-2 min-w-[60px]">
                    <span className="text-2xl font-bold text-chart-3">01</span>
                    <span className="text-xs text-muted-foreground">APR</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      New Semester Registration
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Online portal opens
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-none">
              <CardHeader>
                <CardTitle>Performance by Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Computer Science
                    </span>
                    <span className="text-sm font-semibold">92%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: '92%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Mathematics</span>
                    <span className="text-sm font-semibold">88%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: '88%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Physics</span>
                    <span className="text-sm font-semibold">85%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-chart-3"
                      style={{ width: '85%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Chemistry</span>
                    <span className="text-sm font-semibold">82%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-chart-4"
                      style={{ width: '82%' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-none">
              <CardHeader>
                <CardTitle>Student Satisfaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Teaching Quality
                    </span>
                    <span className="text-sm font-semibold">4.5/5.0</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: '90%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Course Content</span>
                    <span className="text-sm font-semibold">4.3/5.0</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: '86%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Facilities</span>
                    <span className="text-sm font-semibold">4.1/5.0</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-chart-3"
                      style={{ width: '82%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Support Services
                    </span>
                    <span className="text-sm font-semibold">4.4/5.0</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-chart-4"
                      style={{ width: '88%' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
