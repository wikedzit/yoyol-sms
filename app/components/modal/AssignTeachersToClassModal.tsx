import { useEffect, useState } from 'react';
import type { FetcherWithComponents } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { Badge } from '~/components/ui/badge';

interface AssignTeachersToClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classData: {
    id: number;
    name: string;
    EducationalLevel: string;
    section: string;
  };
  availableTeachers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  }>;
  assignedTeachers: Array<{
    id: number;
    firstName: string;
    lastName: string;
  }>;
  fetcher: FetcherWithComponents<any>;
}

export default function AssignTeachersToClassModal({
  open,
  setOpen,
  classData,
  availableTeachers,
  assignedTeachers,
  fetcher,
}: AssignTeachersToClassModalProps) {
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);

  // Initialize with already assigned teachers
  useEffect(() => {
    setSelectedTeachers(assignedTeachers.map((teacher) => teacher.id));
  }, [assignedTeachers]);

  const handleToggleTeacher = (teacherId: number) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('_method', 'POST');
    formData.append('action', 'assign_teachers');
    formData.append('classId', String(classData.id));
    formData.append('teacherIds', JSON.stringify(selectedTeachers));

    fetcher.submit(formData, { method: 'post' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Teachers to {classData.name}</DialogTitle>
          <DialogDescription>
            Select the teachers who will teach in this class. You can assign
            multiple teachers.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
          {availableTeachers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No teachers available
            </p>
          ) : (
            availableTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`teacher-${teacher.id}`}
                  checked={selectedTeachers.includes(teacher.id)}
                  onCheckedChange={() => handleToggleTeacher(teacher.id)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`teacher-${teacher.id}`}
                    className="cursor-pointer"
                  >
                    <div className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {teacher.email}
                    </div>
                  </Label>
                </div>
                <Badge
                  variant={teacher.status === 'Active' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {teacher.status}
                </Badge>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={fetcher.state === 'submitting'}
            className="bg-primary-gradient"
          >
            {fetcher.state === 'submitting'
              ? 'Assigning...'
              : 'Assign Teachers'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

