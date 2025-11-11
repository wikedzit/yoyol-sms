import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PerformanceChartProps {
  data: Array<{
    month: string;
    excellent: number;
    good: number;
    average: number;
    poor: number;
  }>;
}

// Color scheme for grades
const gradeColors = {
  excellent: '#10b981', // Green for Grade A
  good: '#3b82f6', // Blue for Grade B
  average: '#f59e0b', // Orange/Amber for Grade C
  poor: '#ef4444', // Red for Grade D-F
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Performance Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Grade distribution trends over the year
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              interval={0}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
              formatter={(value: number) => `${value}%`}
            />
            <Legend />
            <Bar
              dataKey="excellent"
              fill={gradeColors.excellent}
              name="Excellent (A)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="good"
              fill={gradeColors.good}
              name="Good (B)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="average"
              fill={gradeColors.average}
              name="Average (C)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="poor"
              fill={gradeColors.poor}
              name="Poor (D-F)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
