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

interface AssignSubjectsToStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  student: {
    id: number;
    firstName: string;
    lastName: string;
  };
  availableSubjects: Array<{
    id: number;
    subjectName: string;
    code: string;
    status: string;
  }>;
  assignedSubjects: Array<{
    id: number;
    subjectName: string;
    code: string;
  }>;
  fetcher: FetcherWithComponents<any>;
}

export default function AssignSubjectsToStudentModal({
  open,
  setOpen,
  student,
  availableSubjects,
  assignedSubjects,
  fetcher,
}: AssignSubjectsToStudentModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Initialize with already assigned subjects
  useEffect(() => {
    setSelectedSubjects(assignedSubjects.map((s) => s.id));
  }, [assignedSubjects]);

  const handleToggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('_method', 'POST');
    formData.append('action', 'assign_subjects');
    formData.append('studentId', String(student.id));
    formData.append('subjectIds', JSON.stringify(selectedSubjects));

    fetcher.submit(formData, { method: 'post' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Assign Subjects to {student.firstName} {student.lastName}
          </DialogTitle>
          <DialogDescription>
            Select the subjects this student will be enrolled in. You can assign
            multiple subjects.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
          {availableSubjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No subjects available
            </p>
          ) : (
            availableSubjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`subject-${subject.id}`}
                  checked={selectedSubjects.includes(subject.id)}
                  onCheckedChange={() => handleToggleSubject(subject.id)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`subject-${subject.id}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="font-medium">{subject.subjectName}</span>
                    <Badge variant="outline" className="text-xs">
                      {subject.code}
                    </Badge>
                  </Label>
                </div>
                <Badge
                  variant={subject.status === 'Active' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {subject.status}
                </Badge>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline"
          className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
  onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={fetcher.state === 'submitting'}
            className="bg-primary-gradient hover:scale-110 hover:text-white-600 transition cursor-pointer">
          
            {fetcher.state === 'submitting' ? 'Assigning...' : 'Assign Subjects'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

