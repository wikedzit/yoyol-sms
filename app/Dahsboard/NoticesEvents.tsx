import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Calendar, Bell, AlertCircle, Info } from 'lucide-react';

const notices = [
  {
    title: 'Mid-term Examinations',
    description: 'Mid-term exams will commence from next Monday',
    date: 'Dec 18-22, 2025',
    type: 'exam',
    priority: 'high',
  },
  {
    title: 'Winter Break',
    description: 'Campus will be closed for winter holidays',
    date: 'Dec 24 - Jan 2',
    type: 'holiday',
    priority: 'normal',
  },
  {
    title: 'New Course Registration',
    description: 'Spring semester registration opens',
    date: 'Jan 5, 2026',
    type: 'registration',
    priority: 'high',
  },
  {
    title: 'Faculty Meeting',
    description: 'All department heads required to attend',
    date: 'Dec 15, 2025',
    type: 'meeting',
    priority: 'normal',
  },
];

const typeConfig = {
  exam: { icon: AlertCircle, color: 'destructive' },
  holiday: { icon: Calendar, color: 'default' },
  registration: { icon: Bell, color: 'default' },
  meeting: { icon: Info, color: 'secondary' },
};

export function NoticesEvents() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notices & Upcoming Events</CardTitle>
        <p className="text-sm text-muted-foreground">
          Important dates and announcements
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {notices.map((notice, index) => {
          const config = typeConfig[notice.type as keyof typeof typeConfig];
          const Icon = config.icon;

          return (
            <div
              key={index}
              className="flex gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {notice.title}
                  </h4>
                  {notice.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {notice.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{notice.date}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
