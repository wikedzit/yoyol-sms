import { X, Check, BookPlus, Search, CheckSquare, Square } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { FetcherWithComponents } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import type { LevelType } from '~/type/shools';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';

interface ClassInfo {
  id: number;
  name: string;
  formId?: number;
  streamId?: number;
  levelId?: number;
  studentCount?: number;
  formName?: string;
  formNumber?: number;
  streamName?: string;
  streamColor?: 'science' | 'arts' | 'business';
  levelName?: string;
  levelType?: LevelType;
}

interface Subject {
  id: number;
  subjectName: string;
  code: string;
}

interface AssignSubjectsToFormClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classInfo: ClassInfo;
  availableSubjects?: Subject[];
  assignedSubjectIds?: number[];
  fetcher: FetcherWithComponents<any>;
}

export default function AssignSubjectsToFormClassModal({
  open,
  setOpen,
  classInfo,
  availableSubjects = [],
  assignedSubjectIds = [],
  fetcher,
}: AssignSubjectsToFormClassModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [search, setSearch] = useState('');

  const isSubmitting = fetcher.state === 'submitting';

  // Compute filtered subject list based on search term
  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return availableSubjects;
    const query = search.toLowerCase();
    return availableSubjects.filter(
      (subject) =>
        subject.subjectName.toLowerCase().includes(query) ||
        subject.code.toLowerCase().includes(query)
    );
  }, [availableSubjects, search]);

  // Synchronize state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedSubjects(assignedSubjectIds);
      setSearch('');
    }
  }, [open, assignedSubjectIds]);

  // Close modal only on successful response idle state
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  const handleToggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredSubjects.map((s) => s.id);
    const allVisibleSelected = visibleIds.every((id) =>
      selectedSubjects.includes(id)
    );

    if (allVisibleSelected) {
      setSelectedSubjects((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedSubjects((prev) =>
        Array.from(new Set([...prev, ...visibleIds]))
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('_method', 'POST');
    submitData.append('action', 'assign_form_class_subjects');
    submitData.append('classId', String(classInfo.id));
    submitData.append('subjectIds', JSON.stringify(selectedSubjects));

    // Append individual keys for standard backend array parsing
    selectedSubjects.forEach((id) => {
      submitData.append('subjectIds[]', String(id));
    });

    fetcher.submit(submitData, { method: 'post' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[520px] md:w-[520px]
          p-6 md:p-8
          flex flex-col justify-between
          bg-card text-card-foreground border-border
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4 shrink-0">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold flex items-center gap-2 text-foreground">
                <BookPlus className="h-5 w-5 text-primary" />
                Assign Subjects
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X
                size={22}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </SheetClose>
          </div>

          {/* CLASS CONTEXT CARD */}
          <div className="bg-muted/50 border border-border rounded-lg p-3.5 mb-4 shrink-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                {classInfo.name}
              </span>
              {classInfo.levelType && (
                <LevelBadge level={classInfo.levelType} size="sm" />
              )}
              {classInfo.streamColor && (
                <StreamBadge stream={classInfo.streamColor} size="sm" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {[classInfo.formName, classInfo.streamName, classInfo.levelName]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>

          {/* SEARCH BAR */}
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search subject by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs bg-background border-input"
            />
          </div>

          {/* SELECTION TOOLBAR */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border text-xs shrink-0">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{selectedSubjects.length}</strong> of{' '}
              {availableSubjects.length} subjects selected
            </span>
            {filteredSubjects.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllVisible}
                className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
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

          {/* SUBJECT LIST */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                {search
                  ? 'No subjects match your search.'
                  : 'No subjects available for assignment.'}
              </div>
            ) : (
              filteredSubjects.map((subject) => {
                const isChecked = selectedSubjects.includes(subject.id);
                return (
                  <label
                    key={subject.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                          : 'border-border bg-card hover:bg-accent/40'
                      }
                    `}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggleSubject(subject.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">
                        {subject.subjectName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Code: <code className="font-mono">{subject.code}</code>
                      </p>
                    </div>
                    {isChecked && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </label>
                );
              })
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 border-t border-border pt-4 mt-4 shrink-0 bg-card">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
              className="h-10 px-6 w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedSubjects.length === 0}
              className="h-10 px-6 w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {isSubmitting
                ? 'Assigning...'
                : `Assign ${selectedSubjects.length} Subject${
                    selectedSubjects.length !== 1 ? 's' : ''
                  }`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}