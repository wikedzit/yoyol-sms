import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  status?: string; // e.g., "5 mins ago", "available", "updated recently"
}

export default function StatCard({
  status,
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
}: StatCardProps) {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {change && (
              <p
                className={cn(
                  'text-xs mt-2',
                  changeType === 'positive' && 'text-accent',
                  changeType === 'negative' && 'text-destructive',
                  changeType === 'neutral' && 'text-muted-foreground'
                )}
              >
                {change}
              </p>
            )}
            {status && (
              <p className="text-xs text-muted-foreground mt-2">
                {status}
              </p>
            )}
          </div>
          <div className={cn('rounded-lg bg-muted p-3', iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
