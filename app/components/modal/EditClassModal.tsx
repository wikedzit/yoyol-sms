import { useState, useEffect } from 'react';
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
import type { FetcherWithComponents } from 'react-router';

interface EditingClass {
  id: number;
  name: string;
  studentCount?: number;
}

interface EditClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  editingClass: EditingClass | null;
  formNumber?: number;
}

export default function EditClassModal({
  open,
  setOpen,
  fetcher,
  editingClass,
  formNumber,
}: EditClassModalProps) {
  const [name, setName] = useState('');
  const [studentCount, setStudentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Populate form with existing class data on open
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
          !w-full !max-w-full
          sm:!max-w-[420px]
          md:!max-w-[500px]
          lg:!max-w-[573px] lg:!w-[573px]
          p-6 md:p-10 flex flex-col h-full
          bg-card text-card-foreground border-border
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 md:mb-8 shrink-0">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Edit Class
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8 shrink-0">
            Update the details for class{' '}
            <span className="font-medium text-foreground">{editingClass.name}</span>.
          </p>

          {/* SERVER ERROR BANNER */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md shrink-0">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* SCROLLABLE FORM INPUTS */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 md:pr-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Class Name *
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  formNumber
                    ? `e.g., ${formNumber}A, ${formNumber}B, ${formNumber}C`
                    : 'e.g., 1A, 1B, 2C'
                }
                required
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter a unique name for this class
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Student Count
              </label>
              <Input
                name="studentCount"
                type="number"
                min={0}
                value={studentCount}
                onChange={(e) => {
                  setStudentCount(parseInt(e.target.value, 10) || 0);
                  if (error) setError(null);
                }}
                placeholder="0"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Number of students enrolled in this class
              </p>
            </div>
          </div>

          {/* STICKY FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="!h-10 !px-8 sm:!w-auto w-full rounded-[8px] hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state === 'submitting' || !name.trim()}
              className="bg-primary-gradient text-white !h-10 !px-8 sm:!w-auto w-full rounded-[8px] hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}