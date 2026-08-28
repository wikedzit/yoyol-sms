import { useState } from 'react'; 
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


interface StudentProfilesModalProps {
  student: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function StudentProfilesModal({
  student,
  open,
  onOpenChange,
  showTrigger = true, 
}: StudentProfilesModalProps) {
  // new
  const [internalOpen, setInternalOpen] = useState(false);

  // new
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  // 
  if (!student) return null;

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
          <DialogTitle>{student.name}</DialogTitle>
          <DialogDescription>Student Profile Details</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={
                student.photoUrl ||
                (student.gender === 'male'
                  ? '/assets/male-avatar.png'
                  : '/assets/female-avatar.png')
              }
              alt={student.photoUrl ? 'Student Photo' : 'Default Avatar'}
              className="w-16 h-16 rounded-full object-cover border"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mt-4">
            <p>
              <strong>Name:</strong> {student.firstName} {student.lastName}
            </p>
            <p>
              <strong>Gender:</strong> {student.gender}
            </p>
            <p>
              <strong>DOB:</strong> {student.dob}
            </p>
            <p>
              <strong>Course:</strong> {student.course}
            </p>
            <p>
              <strong>Email:</strong> {student.email}
            </p>
            <p>
              <strong>Phone:</strong> {student.phone}
            </p>
            <p>
              <strong>Address:</strong> {student.address}
            </p>
            <p>
                <strong>School:</strong> {student.schoolName}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}