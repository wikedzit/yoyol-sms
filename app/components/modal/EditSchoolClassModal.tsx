import { X } from 'lucide-react';
import { Input } from '~/components/ui/input';
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
import type { FetcherWithComponents } from 'react-router';

interface EnrichedFormClass {
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

interface EditSchoolClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  editingClass: EnrichedFormClass | null;
}

export default function EditSchoolClassModal({
  open,
  setOpen,
  fetcher,
  editingClass,
}: EditSchoolClassModalProps) {
  const [name, setName] = useState('');
  const [studentCount, setStudentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Populate form with existing class data
  useEffect(() => {
    if (editingClass && open) {
      setName(editingClass.name || '');
      setStudentCount(editingClass.studentCount || 0);
      setError(null);
    }
  }, [editingClass, open]);

  // Close modal on successful update or display server errors
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      setError(null);
    }
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  if (!editingClass) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const submitData = new FormData();
    submitData.append('_method', 'PUT');
    submitData.append('id', String(editingClass.id));
    submitData.append('name', name);
    submitData.append('studentCount', String(studentCount));
    fetcher.submit(submitData, { method: 'post' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[480px] md:w-[480px]
          p-6 md:p-8
          flex flex-col justify-between
          bg-card text-card-foreground border-border
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Edit Class
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Update the details for class{' '}
            <span className="font-medium text-foreground">{editingClass.name}</span>.
          </p>

          {/* Server Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-5">
            {/* Class Context Info */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <LevelBadge level={editingClass.levelType} size="sm" />
                <StreamBadge stream={editingClass.streamColor} size="sm" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Level:</span>
                  <span className="ml-2 font-medium text-foreground">{editingClass.levelName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stream:</span>
                  <span className="ml-2 font-medium text-foreground">{editingClass.streamName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Form:</span>
                  <span className="ml-2 font-medium text-foreground">{editingClass.formName}</span>
                </div>
              </div>
            </div>

            {/* FORM INPUTS */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Class Name
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`e.g., ${editingClass.formNumber}A, ${editingClass.formNumber}B`}
                required
                className="h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter a unique name for this class
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Student Count
              </label>
              <Input
                name="studentCount"
                type="number"
                min={0}
                value={studentCount}
                onChange={(e) => {
                  setStudentCount(parseInt(e.target.value) || 0);
                  if (error) setError(null);
                }}
                placeholder="0"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Number of students enrolled in this class
              </p>
            </div>
          </div>

          {/* STICKY FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 px-6 w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white h-11 px-6 w-full sm:w-auto hover:scale-105 transition cursor-pointer"
              disabled={fetcher.state === 'submitting' || !name.trim()}
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}