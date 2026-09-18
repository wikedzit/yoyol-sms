import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { cn } from '~/lib/utils';

interface StreamInsight {
  name: string;
  students: number;
  percentage: number;
  color: 'science' | 'arts' | 'business';
  levelType: 'o-level' | 'a-level';
}

interface StreamInsightsProps {
  data: StreamInsight[];
}

// Color mapping for streams
// const streamColors: Record<
//   string,
//   { bg: string; text: string; progress: string }
// > = {
//   science: {
//     bg: 'bg-blue-500/10',
//     text: 'text-blue-600 dark:text-blue-400',
//     progress: 'bg-blue-500',
//   },
//   arts: {
//     bg: 'bg-purple-500/10',
//     text: 'text-purple-600 dark:text-purple-400',
//     progress: 'bg-purple-500',
//   },
//   business: {
//     bg: 'bg-emerald-500/10',
//     text: 'text-emerald-600 dark:text-emerald-400',
//     progress: 'bg-emerald-500',
//   },
// };

export function StreamInsights({ data }: StreamInsightsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stream Distribution</CardTitle>
          <p className="text-sm text-muted-foreground">
            Student distribution across academic streams
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No stream data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stream Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Student distribution across academic streams
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((stream) => {
          // const colors = streamColors[stream.color] || streamColors.science;

          return (
            <div
              key={`${stream.name}-${stream.levelType}`}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium')}>{stream.name}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full')}>
                    {stream.levelType === 'o-level' ? 'O-Level' : 'A-Level'}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {stream.students} students
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full transition-all bg-gray-500')}
                  style={{ width: `${stream.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
