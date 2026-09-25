import { useEffect, useState } from 'react';
import type { FetcherWithComponents } from 'react-router';
import { toast } from 'sonner';
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

interface AssignSubjectsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;

  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  };

  availableSubjects: Array<{
    id: number;
    subjectName: string;
    code: string;
  }>;

  assignedSubjects: Array<{
    id: number;
    subjectName: string;
    code: string;
  }>;

  fetcher: FetcherWithComponents<any>;
}

export default function AssignSubjectsModal({
  open,
  setOpen,
  teacher,
  availableSubjects,
  assignedSubjects,
  fetcher,
}: AssignSubjectsModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Load subjects ambazo teacher tayari amepewa
  useEffect(() => {
    setSelectedSubjects(
      assignedSubjects.map((subject) => subject.id)
    );
  }, [assignedSubjects]);

  // Select / unselect subject
  const handleToggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Save assignments
 // Save assignments
const handleSubmit = () => {
  if (selectedSubjects.length === 0) {
    toast.error('Please select at least one subject');
    return;
  }

  const formData = new FormData();

  formData.append('_method', 'POST');
  formData.append('action', 'assign_subjects');
  formData.append('teacherId', String(teacher.id));
  formData.append(
    'subjectIds',
    JSON.stringify(selectedSubjects)
  );

  fetcher.submit(formData, {
    method: 'post',
  });

  setOpen(false);
};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">

        <DialogHeader>
          <DialogTitle>
            Assign Subjects to {teacher.firstName} {teacher.lastName}
          </DialogTitle>

          <DialogDescription>
            Select the subjects that this teacher will teach.
            You can assign multiple subjects.
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
                  onCheckedChange={() =>
                    handleToggleSubject(subject.id)
                  }
                />

                <div className="flex-1">
                  <Label
                    htmlFor={`subject-${subject.id}`}
                    className="cursor-pointer"
                  >
                    <div className="font-medium">
                      {subject.subjectName}
                    </div>
                  </Label>
                </div>

                <Badge
                  variant="outline"
                  className="text-xs"
                >
                  {subject.code}
                </Badge>
              </div>
            ))
          )}

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            className="hover:scale-110 transition cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={fetcher.state === 'submitting'}
            className="bg-primary-gradient hover:scale-110 transition cursor-pointer"
          >
            {fetcher.state === 'submitting'
              ? 'Assigning...'
              : 'Assign Subjects'}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}