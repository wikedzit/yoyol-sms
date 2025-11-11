import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';

const departmentData = [
  {
    name: 'Computer Science',
    students: 450,
    percentage: 90,
    color: 'bg-chart-1',
  },
  { name: 'Engineering', students: 380, percentage: 76, color: 'bg-chart-2' },
  {
    name: 'Business Administration',
    students: 320,
    percentage: 64,
    color: 'bg-chart-3',
  },
  {
    name: 'Arts & Humanities',
    students: 280,
    percentage: 56,
    color: 'bg-chart-4',
  },
  {
    name: 'Natural Sciences',
    students: 240,
    percentage: 48,
    color: 'bg-chart-5',
  },
];

export function DepartmentInsights() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Department & Faculty Insights</CardTitle>
        <p className="text-sm text-muted-foreground">
          Student distribution across departments
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {departmentData.map((dept) => (
          <div key={dept.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{dept.name}</span>
              <span className="text-muted-foreground">
                {dept.students} students
              </span>
            </div>
            <Progress value={dept.percentage} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
