import { useEffect, useState, useMemo } from 'react';
import type { FetcherWithComponents } from 'react-router';
import { Layers, Search, CheckSquare, Square, Filter } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

interface Subject {
  id: number;
  subjectName: string;
  code: string;
  status: string;
  departments?: string;
}

interface AssignSubjectsToClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classData: {
    id: number | string;
    name: string;
    EducationalLevel?: string;
    section?: string;
  };
  availableSubjects: Subject[];
  assignedSubjects: Array<{ id: number; subjectName: string; code: string }>;
  fetcher: FetcherWithComponents<any>;
}

export default function AssignSubjectsToClassModal({
  open,
  setOpen,
  classData,
  availableSubjects = [],
  assignedSubjects = [],
  fetcher,
}: AssignSubjectsToClassModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const isSubmitting = fetcher.state === 'submitting';

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const list = availableSubjects
      .map((s) => s.departments)
      .filter((dept): dept is string => Boolean(dept));
    return Array.from(new Set(list));
  }, [availableSubjects]);

  // Synchronize state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedSubjects(assignedSubjects.map((subject) => subject.id));
      setSearchQuery('');
      setSelectedDepartment('all');
    }
  }, [open, assignedSubjects]);

  // Handle auto-closing on successful submission
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data, setOpen]);

  // Filtered dataset computed from search query and selected department
  const filteredSubjects = useMemo(() => {
    return availableSubjects.filter((subject) => {
      const matchesSearch =
        subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept =
        selectedDepartment === 'all' || subject.departments === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [availableSubjects, searchQuery, selectedDepartment]);

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
    formData.append('action', 'assign_class_subjects');
    formData.append('classId', String(classData.id));
    formData.append('subjectIds', JSON.stringify(selectedSubjects));

    // Append individual items for backend parser compatibility
    selectedSubjects.forEach((id) => {
      formData.append('subjectIds[]', String(id));
    });

    fetcher.submit(formData, { method: 'post' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[620px] bg-card text-card-foreground border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* HEADER */}
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <Layers className="h-5 w-5 text-primary" />
              Assign Subjects to {classData.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure curriculum subjects for {classData.name}{' '}
              {classData.section ? `(${classData.section})` : ''}.
            </DialogDescription>
          </DialogHeader>

          {/* SEARCH & DEPARTMENT FILTER BAR */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search subject or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background border-input"
              />
            </div>

            {departments.length > 0 && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-9 w-full sm:w-[170px] text-xs bg-background border-input">
                  <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* SELECT ALL TOOLBAR */}
          {filteredSubjects.length > 0 && (
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
              <span>
                Showing {filteredSubjects.length} of {availableSubjects.length} subjects
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="text-xs h-7 px-2 hover:text-foreground"
              >
                {filteredSubjects.every((s) => selectedSubjects.includes(s.id)) ? (
                  <>
                    <Square className="h-3.5 w-3.5 mr-1" /> Deselect Visible
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 mr-1 text-primary" /> Select Visible
                  </>
                )}
              </Button>
            </div>
          )}

          {/* SUBJECT LIST */}
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 border border-border rounded-md p-2 bg-background/50">
            {filteredSubjects.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 text-xs">
                {searchQuery || selectedDepartment !== 'all'
                  ? 'No subjects match your filter criteria.'
                  : 'No available subjects found.'}
              </div>
            ) : (
              filteredSubjects.map((subject) => {
                const isChecked = selectedSubjects.includes(subject.id);
                return (
                  <Label
                    key={subject.id}
                    htmlFor={`class-subject-${subject.id}`}
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
                      id={`class-subject-${subject.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleSubject(subject.id)}
                    />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="flex flex-col truncate">
                        <span className="font-medium text-sm text-foreground truncate">
                          {subject.subjectName}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <code className="bg-muted px-1 rounded text-[10px]">
                            {subject.code}
                          </code>
                          {subject.departments && `• ${subject.departments}`}
                        </span>
                      </div>
                      <Badge
                        variant={subject.status === 'Active' ? 'default' : 'secondary'}
                        className="text-[10px] px-2 py-0 shrink-0"
                      >
                        {subject.status}
                      </Badge>
                    </div>
                  </Label>
                );
              })
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Assigned: <strong className="text-foreground">{selectedSubjects.length}</strong> subjects
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
                {isSubmitting ? 'Saving...' : 'Save Curriculum'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}