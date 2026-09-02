import { X, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import { useState, useEffect } from 'react';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import type { LevelType } from '~/type/shools';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';

interface ClassInfo {
  id: number;
  name: string;
  formId: number;
  streamId: number;
  levelId: number;
  studentCount: number;
  formName: string;
  formNumber: number;
  streamName: string;
  streamColor: 'science' | 'arts' | 'business';
  levelName: string;
  levelType: LevelType;
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
  availableSubjects: Subject[];
  fetcher: any;
}

export default function AssignSubjectsToFormClassModal({
  open,
  setOpen,
  classInfo,
  availableSubjects,
  fetcher,
}: AssignSubjectsToFormClassModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [search, setSearch] = useState('');

  // Filter subjects based on search
  const filteredSubjects = availableSubjects.filter(
    (subject) =>
      subject.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      subject.code.toLowerCase().includes(search.toLowerCase())
  );

  // Close modal on successful assignment
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedSubjects([]);
      setSearch('');
    }
  }, [open]);

  const handleToggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubjects.length === filteredSubjects.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(filteredSubjects.map((s) => s.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('action', 'assign_subjects');
    submitData.append('classId', String(classInfo.id));
    submitData.append('subjectIds', JSON.stringify(selectedSubjects));
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
          flex flex-col
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                Assign Subjects
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X
                size={24}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </SheetClose>
          </div>

          {/* Class Context */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{classInfo.name}</span>
              <LevelBadge level={classInfo.levelType} size="sm" />
              <StreamBadge stream={classInfo.streamColor} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              {classInfo.formName} • {classInfo.streamName} • {classInfo.levelName}
            </p>
          </div>

          {/* Search */}
          <div className="mb-4">
            <Input
              type="search"
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <span className="text-sm text-muted-foreground">
              {selectedSubjects.length} of {availableSubjects.length} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedSubjects.length === filteredSubjects.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>

          {/* Subject List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search
                  ? 'No subjects match your search'
                  : 'No subjects available'}
              </div>
            ) : (
              filteredSubjects.map((subject) => (
                <label
                  key={subject.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSubjects.includes(subject.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedSubjects.includes(subject.id)}
                    onCheckedChange={() => handleToggleSubject(subject.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{subject.subjectName}</p>
                    <p className="text-sm text-muted-foreground">
                      Code: {subject.code}
                    </p>
                  </div>
                  {selectedSubjects.includes(subject.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </label>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 px-6 w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white h-10 px-6 w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
              disabled={fetcher.state === 'submitting'}
            >
              {fetcher.state === 'submitting'
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

