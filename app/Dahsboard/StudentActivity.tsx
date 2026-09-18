import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { UserPlus, UserCheck, UserX } from 'lucide-react';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  course?: string | null;
  createdAt?: number | null;
  status?: string | null;
}

interface StudentActivityProps {
  recentStudents: Student[];
  activityStats: {
    newThisWeek: number;
    activeStudents: number;
    inactiveStudents: number;
  };
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

export function StudentActivity({
  recentStudents,
  activityStats,
}: StudentActivityProps) {
  const stats = [
    {
      label: 'New This Week',
      value: activityStats.newThisWeek.toLocaleString(),
      icon: UserPlus,
      color: 'text-success',
    },
    {
      label: 'Active Students',
      value: activityStats.activeStudents.toLocaleString(),
      icon: UserCheck,
      color: 'text-info',
    },
    {
      label: 'Inactive',
      value: activityStats.inactiveStudents.toLocaleString(),
      icon: UserX,
      color: 'text-warning',
    },
  ];

  const activities = recentStudents.slice(0, 4).map((student) => ({
    type: 'registration' as const,
    student: `${student.firstName} ${student.lastName}`,
    detail: student.course
      ? `Enrolled in ${student.course}`
      : 'New student registration',
    time: student.createdAt
      ? formatTimeAgo(student.createdAt)
      : 'Recently',
    icon: UserPlus,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Recent registrations and updates
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex justify-center mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pb-4 last:pb-0 border-b border-border last:border-0"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <activity.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.student}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.detail}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent student activity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
