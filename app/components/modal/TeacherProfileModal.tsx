// app/components/modal/TeacherProfileModal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
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
  
  // added internal state to manage the modal's open state when not controlled
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  if (!teacher) return null;

  const subjects: any[] = teacher.subjects ?? [];

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          <div className="border-t pt-3">
            <p className="text-sm font-semibold">
              Assigned Subjects ({subjects.length})
            </p>

            {subjects.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {subjects.map((subject: any) => (
                  <li
                    key={subject.id}
                    className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                  >
                    <Badge variant="secondary" className="text-xs">
                      {subject.code}
                    </Badge>
                    <span>{subject.subjectName ?? subject.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No subjects assigned
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}