import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';

interface DepartmentInsight {
  name: string;
  students: number;
  percentage: number;
}

interface DepartmentInsightsProps {
  data: DepartmentInsight[];
}

const chartColors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

export function DepartmentInsights({ data }: DepartmentInsightsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Department & Faculty Insights</CardTitle>
          <p className="text-sm text-muted-foreground">
            Student distribution across departments
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No department data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department & Faculty Insights</CardTitle>
        <p className="text-sm text-muted-foreground">
          Student distribution across departments
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((dept, index) => (
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
