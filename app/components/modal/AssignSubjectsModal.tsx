import { useEffect, useState, useMemo } from 'react';
import type { FetcherWithComponents } from 'react-router';
import { BookOpen, Search, CheckSquare, Square } from 'lucide-react';
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

interface AssignSubjectsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  };
  availableSubjects: Subject[];
  assignedSubjects: Subject[];
  fetcher: FetcherWithComponents<any>;
}

export default function AssignSubjectsModal({
  open,
  setOpen,
  teacher,
  availableSubjects = [],
  assignedSubjects = [],
  fetcher,
}: AssignSubjectsModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const isSubmitting = fetcher.state === 'submitting';

  // Synchronize assigned subjects on drawer/dialog open
  useEffect(() => {
    if (open) {
      setSelectedSubjects(assignedSubjects.map((s) => s.id));
      setSearchQuery('');
    }
  }, [open, assignedSubjects]);

  // Handle auto-close upon successful submission
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data, setOpen]);

  // Filter subjects based on search query
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
    formData.append('teacherId', String(teacher.id));
    formData.append('subjectIds', JSON.stringify(selectedSubjects));

    // Append individual array items for backend framework compatibility
    selectedSubjects.forEach((id) => {
      formData.append('subjectIds[]', String(id));
    });

    fetcher.submit(formData, { method: 'post' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[580px] bg-card text-card-foreground border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* HEADER */}
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <BookOpen className="h-5 w-5 text-primary" />
              Assign Subjects to {teacher.firstName} {teacher.lastName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select or remove subjects assigned to this instructor.
            </DialogDescription>
          </DialogHeader>

          {/* SEARCH & QUICK ACTION TOOLBAR */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-2">
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search subjects or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background border-input"
              />
            </div>
            
            {filteredSubjects.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="text-xs text-muted-foreground hover:text-foreground h-9 px-3 w-full sm:w-auto"
              >
                {filteredSubjects.every((s) => selectedSubjects.includes(s.id)) ? (
                  <>
                    <Square className="h-3.5 w-3.5 mr-1.5" />
                    Deselect Visible
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Select Visible ({filteredSubjects.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* CHECKBOX LIST */}
          <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 border border-border rounded-md p-2 bg-background/50">
            {filteredSubjects.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 text-xs">
                {searchQuery ? 'No matching subjects found.' : 'No subjects available.'}
              </div>
            ) : (
              filteredSubjects.map((subject) => {
                const isChecked = selectedSubjects.includes(subject.id);
                return (
                  <Label
                    key={subject.id}
                    htmlFor={`subject-${subject.id}`}
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
                      id={`subject-${subject.id}`}
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

          {/* SELECTION SUMMARY & FOOTER ACTIONS */}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Selected: <strong className="text-foreground">{selectedSubjects.length}</strong> subjects
            </span>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setOpen(false)}
                className="h-9 px-4 text-xs w-full sm:w-auto hover:scale-105 transition cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 text-xs w-full sm:w-auto hover:scale-105 transition cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Assignments'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}