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

interface AssignSubjectsToSemesterModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  semesterData: {
    id: number;
    name: string;
    semesterNumber: number;
  };
  availableSubjects: Array<{
    id: number;
    subjectName: string;
    code: string;
    status: string;
    departments: string;
  }>;
  assignedSubjects: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  fetcher: FetcherWithComponents<any>;
}

export default function AssignSubjectsToSemesterModal({
  open,
  setOpen,
  semesterData,
  availableSubjects,
  assignedSubjects,
  fetcher,
}: AssignSubjectsToSemesterModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Initialize with already assigned subjects
  useEffect(() => {
    setSelectedSubjects(assignedSubjects.map((subject) => Number(subject.id)));
  }, [assignedSubjects, open]);

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
    formData.append('_entity', 'semester-subject');
    formData.append('semesterId', String(semesterData.id));
    selectedSubjects.forEach((subjectId) => {
      formData.append('subjectIds', String(subjectId));
    });

    fetcher.submit(formData, { method: 'post' });
  };

  // Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Subjects to {semesterData.name}</DialogTitle>
          <DialogDescription>
            Select the subjects that will be taught in this semester. You can
            assign multiple subjects.
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
                    className="cursor-pointer"
                  >
                    <div className="font-medium">{subject.subjectName}</div>
                    <div className="text-xs text-muted-foreground">
                      {subject.code} • {subject.departments}
                    </div>
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={fetcher.state === 'submitting'}
            className="bg-primary-gradient text-white"
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

