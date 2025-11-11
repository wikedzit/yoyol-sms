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

const data = [
  { month: 'Jan', excellent: 45, good: 68, average: 52, poor: 15 },
  { month: 'Feb', excellent: 52, good: 72, average: 48, poor: 12 },
  { month: 'Mar', excellent: 58, good: 75, average: 45, poor: 10 },
  { month: 'Apr', excellent: 65, good: 78, average: 42, poor: 8 },
  { month: 'May', excellent: 70, good: 82, average: 38, poor: 7 },
  { month: 'Jun', excellent: 75, good: 85, average: 35, poor: 5 },
];

export function PerformanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Performance Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Grade distribution trends over the semester
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
            />
            <Legend />
            <Bar
              dataKey="excellent"
              fill="hsl(var(--chart-1))"
              name="Excellent (A)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="good"
              fill="hsl(var(--chart-2))"
              name="Good (B)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="average"
              className="bg-red-500"
              fill="hsl(var(--chart-3))"
              name="Average (C)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="poor"
              fill="hsl(var(--chart-4))"
              name="Poor (D-F)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
