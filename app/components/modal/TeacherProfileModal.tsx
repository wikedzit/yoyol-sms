import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Eye } from 'lucide-react';
import { useState } from 'react';

interface TeacherProfileModalProps {
  teacher: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function TeacherProfileModal({
  teacher,
  open,
  onOpenChange,
  showTrigger = true,
}: TeacherProfileModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  if (!teacher) return null;

  const subjectNames = Array.isArray(teacher.subjects)
    ? teacher.subjects
        .map((subject: any) => subject?.subjectName || subject?.name || subject?.code)
        .filter(Boolean)
    : teacher.subject
      ? [teacher.subject]
      : [];

  const subjectDisplay = subjectNames.length ? subjectNames.join(', ') : 'Not assigned';

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {teacher.firstName} {teacher.lastName}
          </DialogTitle>
          <DialogDescription>Teacher Profile Details</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={
                teacher.photoUrl ||
                (teacher.gender === 'male'
                  ? '/assets/male-avatar.png'
                  : '/assets/female-avatar.png')
              }
              alt={teacher.photoUrl ? 'Teacher Photo' : 'Default Avatar'}
              className="w-16 h-16 rounded-full object-cover border"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mt-4">
            <p>
              <strong>Name:</strong> {teacher.firstName} {teacher.lastName}
            </p>
            <p>
              <strong>Gender:</strong> {teacher.gender}
            </p>
            <p>
              <strong>Email:</strong> {teacher.email}
            </p>
            <p>
              <strong>Phone:</strong> {teacher.phone}
            </p>
            <p>
              <strong>Qualification:</strong> {teacher.qualification}
            </p>
            <p>
              <strong>Experience:</strong> {teacher.experience} years
            </p>
            <p>
              <strong>Address:</strong> {teacher.address}
            </p>
            <p>
              <strong>Subject:</strong> {subjectDisplay}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span
                className={`${
                  teacher.status === 'Active'
                    ? 'text-green-600'
                    : teacher.status === 'Inactive'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                } font-medium`}
              >
                {teacher.status}
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}