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

export function StudentProfilesModal({ student }: { student: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>

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
            {/* for later */}
            {/* <p>
              <strong>Grade:</strong> {student.grade}
            </p> */}
            <p>
              <strong>Email:</strong> {student.email}
            </p>
            <p>
              <strong>Phone:</strong> {student.phone}
            </p>
            <p>
              <strong>Address:</strong> {student.address}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
