import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { Building2, Calendar, Hash } from 'lucide-react';

interface CourseHeaderProps {
  name: string;
  code: string;
  duration: string;
  department: string;
  status: 'Active' | 'Inactive' | 'Draft';
}

export function CourseHeader({
  name,
  code,
  duration,
  department,
  status,
}: CourseHeaderProps) {
  const statusColors = {
    Active: 'bg-success text-white',
    Inactive: 'bg-muted text-muted-foreground',
    Draft: 'bg-warning text-white',
  };

  return (
    <Card className="p-6 mb-6 border-none shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{name}</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              <span>{code}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{department}</span>
            </div>
          </div>
        </div>
        <Badge className={statusColors[status]}>{status}</Badge>
      </div>
    </Card>
  );
}
