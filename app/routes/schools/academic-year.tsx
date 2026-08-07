import { CalendarRange } from 'lucide-react';
import { PageHeader } from '~/components/ui/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

export default function AcademicYearPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Year"
        description="Configure academic years, terms, and active periods"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Coming soon
          </CardTitle>
          <CardDescription>
            Academic year management is not available yet. You will be able to
            create years, set start/end dates, and mark the active year here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page is a placeholder so navigation under Schools Setup works
            while the feature is being built.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
