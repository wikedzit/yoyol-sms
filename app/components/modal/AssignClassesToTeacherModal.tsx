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
import { toast } from 'sonner';
interface AssignClassesToTeacherModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  };
  availableClasses: Array<{
    id: number;
    name: string;
    formId: number;
    streamId: number;
    levelId: number;
    studentCount: number;
  }>;
  assignedClasses: Array<{
    id: number;
    name: string;
    formId: number;
    streamId: number;
    levelId: number;
  }>;
  fetcher: FetcherWithComponents<any>;
}

export default function AssignClassesToTeacherModal({
  open,
  setOpen,
  teacher,
  availableClasses,
  assignedClasses,
  fetcher,
}: AssignClassesToTeacherModalProps) {
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

  // Initialize with already assigned classes
  useEffect(() => {
    setSelectedClasses(assignedClasses.map((classItem) => classItem.id));
  }, [assignedClasses]);

  const handleToggleClass = (classId: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

const handleSubmit = () => {
  if (selectedClasses.length === 0) {
    toast.error('Please select at least one class');
    return;
  }

  const formData = new FormData();
  formData.append('_method', 'POST');
  formData.append('action', 'assign_classes');
  formData.append('teacherId', String(teacher.id));
  formData.append('classIds', JSON.stringify(selectedClasses));

  fetcher.submit(formData, { method: 'post' });
  setOpen(false);
};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Assign Classes to {teacher.firstName} {teacher.lastName}
          </DialogTitle>
          <DialogDescription>
            Select the classes this teacher will teach. You can assign multiple
            classes.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
          {availableClasses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No classes available
            </p>
          ) : (
            availableClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`class-${classItem.id}`}
                  checked={selectedClasses.includes(classItem.id)}
                  onCheckedChange={() => handleToggleClass(classItem.id)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`class-${classItem.id}`}
                    className="cursor-pointer"
                  >
                    <div className="font-medium">{classItem.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Form {classItem.formId} • Stream {classItem.streamId} •
                      Level {classItem.levelId}
                    </div>
                  </Label>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline"  className="hover:scale-110 hover:text-white-600 transition cursor-pointer" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={fetcher.state === 'submitting'}
            className="bg-primary-gradient  hover:scale-110 hover:text-white-600 transition cursor-pointer"
          >
            {fetcher.state === 'submitting'
              ? 'Assigning...'
              : 'Assign Classes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

