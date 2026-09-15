import { useEffect, useState, useMemo } from 'react';
import type { FetcherWithComponents } from 'react-router';
import { UserCheck, Search, CheckSquare, Square } from 'lucide-react';
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

interface Subject {
  id: number;
  subjectName: string;
  code: string;
  status?: string;
}

interface AssignSubjectsToStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  student: {
    id: number;
    firstName: string;
    lastName: string;
  };
  availableSubjects?: Subject[];
  assignedSubjects?: Subject[];
  fetcher: FetcherWithComponents<any>;
}

export default function AssignSubjectsToStudentModal({
  open,
  setOpen,
  student,
  availableSubjects = [],
  assignedSubjects = [],
  fetcher,
}: AssignSubjectsToStudentModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const isSubmitting = fetcher.state === 'submitting';

  // Synchronize state when the modal opens
  useEffect(() => {
    if (open) {
      setSelectedSubjects(assignedSubjects.map((s) => s.id));
      setSearchQuery('');
    }
  }, [open, assignedSubjects]);

  // Handle auto-closing on successful submission
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data, setOpen]);

  // Filter subjects based on query
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return availableSubjects;
    const query = searchQuery.toLowerCase();
    return availableSubjects.filter(
      (s) =>
        s.subjectName.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query)
    );
  }, [availableSubjects, searchQuery]);

  const handleToggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredSubjects.map((s) => s.id);
    const allSelected = filteredIds.every((id) => selectedSubjects.includes(id));

    if (allSelected) {
      setSelectedSubjects((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedSubjects((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('_method', 'POST');
    formData.append('action', 'assign_subjects');
    formData.append('studentId', String(student.id));
    formData.append('subjectIds', JSON.stringify(selectedSubjects));

    // Append individual array entries for form parser compatibility
    selectedSubjects.forEach((id) => {
      formData.append('subjectIds[]', String(id));
    });

    fetcher.submit(formData, { method: 'post' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-[580px] bg-card text-card-foreground border-border p-4 sm:p-6 rounded-lg max-h-[90vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* HEADER */}
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <UserCheck className="h-5 w-5 text-primary" />
              Assign Subjects to {student.firstName} {student.lastName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select or update the subjects this student is enrolled in.
            </DialogDescription>
          </DialogHeader>

          {/* SEARCH & QUICK ACTION TOOLBAR */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-2">
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search subject or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background border-input"
              />
            </div>

            {filteredSubjects.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="text-xs h-9 px-4 w-full sm:w-auto border shadow-sm transition-colors"
              >
                {filteredSubjects.every((s) => selectedSubjects.includes(s.id)) ? (
                  <>
                    <Square className="h-4 w-4 mr-2 opacity-70" />
                    Deselect Visible
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                    Select Visible ({filteredSubjects.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* CHECKBOX LIST */}
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 border border-border rounded-md p-2 bg-background/50">
            {filteredSubjects.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 text-xs">
                {searchQuery ? 'No matching subjects found.' : 'No available subjects.'}
              </div>
            ) : (
              filteredSubjects.map((subject) => {
                const isChecked = selectedSubjects.includes(subject.id);
                return (
                  <Label
                    key={subject.id}
                    htmlFor={`student-subject-${subject.id}`}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                      ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                          : 'border-border bg-card hover:bg-accent/40'
                      }
                    `}
                  >
                    <Checkbox
                      id={`student-subject-${subject.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleSubject(subject.id)}
                    />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium text-sm text-foreground truncate">
                          {subject.subjectName}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                          {subject.code}
                        </Badge>
                      </div>
                      {subject.status && (
                        <Badge
                          variant={subject.status === 'Active' ? 'default' : 'secondary'}
                          className="text-[10px] px-2 py-0 shrink-0"
                        >
                          {subject.status}
                        </Badge>
                      )}
                    </div>
                  </Label>
                );
              })
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <DialogFooter className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-center justify-between pt-4 border-t mt-4">
            <span className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
              Enrolled: <strong className="text-foreground">{selectedSubjects.length}</strong> subjects
            </span>

            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isSubmitting ? 'Assigning...' : 'Save Assignments'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}