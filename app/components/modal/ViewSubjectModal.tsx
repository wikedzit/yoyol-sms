import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { BookOpen, Users, User, GraduationCap } from 'lucide-react';

interface ViewSubjectModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  subject: {
    id: number;
    subjectName: string;
    code: string;
    stream?: string;
    instructor?: string;
    description?: string;
    status?: string;
    enrolledStudents?: number;
    teachers?: Array<{
      id: number;
      firstName: string;
      lastName: string;
    }>;
  } | null;
}

export default function ViewSubjectModal({
  open,
  setOpen,
  subject,
}: ViewSubjectModalProps) {
  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            Subject Details
          </DialogTitle>

          <DialogDescription>
            View detailed information about {subject.subjectName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Subject Header */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {subject.subjectName}
                </h2>

                <p className="text-sm text-muted-foreground">
                  {subject.code}
                </p>
              </div>

              <Badge
                variant={
                  subject.status === 'Active' ? 'default' : 'outline'
                }
              >
                {subject.status || 'Unknown'}
              </Badge>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Subject Code
                </p>
              </div>

              <p className="font-semibold">
                {subject.code}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Stream
                </p>
              </div>

              <p className="font-semibold">
                {subject.stream || 'Not specified'}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Students Enrolled
                </p>
              </div>

              <p className="text-xl font-bold">
                {subject.enrolledStudents || 0}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
              </div>

              <p className="font-semibold">
                {subject.status || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Assigned Teachers */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-primary" />

              <h3 className="font-semibold">
                Assigned Teachers
              </h3>
            </div>

            {subject.teachers && subject.teachers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {subject.teachers.map((teacher) => (
                  <Badge
                    key={teacher.id}
                    variant="secondary"
                    className="px-3 py-1"
                  >
                    {teacher.firstName} {teacher.lastName}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not Assigned
              </p>
            )}
          </div>

          {/* Instructor */}
          {subject.instructor && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />

                <p className="text-sm font-medium text-muted-foreground">
                  Instructor
                </p>
              </div>

              <p className="font-medium">
                {subject.instructor}
              </p>
            </div>
          )}

          {/* Description */}
          {subject.description && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">
                Description
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {subject.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}