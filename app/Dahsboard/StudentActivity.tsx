import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { UserPlus, UserCheck, UserX, Calendar } from 'lucide-react';

const activities = [
  {
    type: 'registration',
    student: 'Emma Johnson',
    detail: 'Enrolled in Computer Science',
    time: '2 hours ago',
    icon: UserPlus,
  },
  {
    type: 'active',
    student: 'Michael Chen',
    detail: 'Completed Assignment #5',
    time: '4 hours ago',
    icon: UserCheck,
  },
  {
    type: 'registration',
    student: 'Sarah Williams',
    detail: 'Enrolled in Business Admin',
    time: '6 hours ago',
    icon: UserPlus,
  },
  {
    type: 'attendance',
    student: 'Class Average',
    detail: '95% attendance rate this week',
    time: 'Today',
    icon: Calendar,
  },
];

const stats = [
  {
    label: 'New This Week',
    value: '24',
    icon: UserPlus,
    color: 'text-success',
  },
  {
    label: 'Active Students',
    value: '1,284',
    icon: UserCheck,
    color: 'text-info',
  },
  { label: 'Inactive', value: '48', icon: UserX, color: 'text-warning' },
];

export function StudentActivity() {
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
          {activities.map((activity, index) => (
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
