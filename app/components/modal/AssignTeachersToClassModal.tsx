import { useEffect, useState, useMemo } from 'react';
import type { FetcherWithComponents } from 'react-router';
import { Search, UserCheck } from 'lucide-react';
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
import { Input } from '~/components/ui/input';

interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

interface AssignedTeacher {
  id: number;
  firstName: string;
  lastName: string;
}

interface AssignTeachersToClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classData: {
    id: number;
    name: string;
    EducationalLevel?: string;
    section?: string;
  };
  availableTeachers: Teacher[];
  assignedTeachers: AssignedTeacher[];
  fetcher: FetcherWithComponents<any>;
}

export default function AssignTeachersToClassModal({
  open,
  setOpen,
  classData,
  availableTeachers = [],
  assignedTeachers = [],
  fetcher,
}: AssignTeachersToClassModalProps) {
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state with incoming assigned teachers when modal opens or dataset changes
  useEffect(() => {
    if (open) {
      setSelectedTeachers(assignedTeachers.map((teacher) => teacher.id));
      setSearchQuery('');
    }
  }, [assignedTeachers, open]);

  // Filter teachers by first name, last name, or email
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return availableTeachers;
    const query = searchQuery.toLowerCase();
    return availableTeachers.filter(
      (teacher) =>
        `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query)
    );
  }, [availableTeachers, searchQuery]);

  const handleToggleTeacher = (teacherId: number) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const isSubmitting = fetcher.state === 'submitting';

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
      <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Assign Teachers &mdash; {classData.name}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select teachers assigned to this class. Selected teachers will be given access to manage grades and schedules.
          </DialogDescription>
        </DialogHeader>

        {/* SEARCH & SELECTION COUNTER */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teacher by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-input"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing {filteredTeachers.length} of {availableTeachers.length} teachers
            </span>
            <span className="font-medium text-foreground flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              {selectedTeachers.length} Selected
            </span>
          </div>
        </div>

        {/* SCROLLABLE TEACHERS LIST */}
        <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 my-2">
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No teachers matching your search' : 'No teachers available'}
              </p>
            </div>
          ) : (
            filteredTeachers.map((teacher) => {
              const isChecked = selectedTeachers.includes(teacher.id);
              return (
                <div
                  key={teacher.id}
                  onClick={() => handleToggleTeacher(teacher.id)}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                    ${
                      isChecked
                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/40'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleTeacher(teacher.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <Label
                        htmlFor={`teacher-${teacher.id}`}
                        className="cursor-pointer font-medium text-foreground block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {teacher.firstName} {teacher.lastName}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {teacher.email}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={teacher.status === 'Active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {teacher.status}
                  </Badge>
                </div>
              );
            })
          )}
        </div>

        {/* DIALOG FOOTER */}
        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
            className="hover:scale-105 transition cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="hover:scale-105 transition cursor-pointer"
          >
            {isSubmitting ? 'Assigning...' : 'Save Assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}