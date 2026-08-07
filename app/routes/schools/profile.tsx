import { Building2 } from 'lucide-react';
import { PageHeader } from '~/components/ui/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

export default function SchoolProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="School Profile"
        description="Manage your school's identity and contact details"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Coming soon
          </CardTitle>
          <CardDescription>
            School profile setup is not available yet. You will be able to edit
            school name, address, contact info, and branding here.
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
