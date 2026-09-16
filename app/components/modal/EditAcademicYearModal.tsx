import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { toTitleCase } from '~/utils/strings';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import type { FetcherWithComponents } from 'react-router';

interface AcademicYear {
  id: string | number;
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: 'upcoming' | 'active' | 'archived' | string;
}

interface EditAcademicYearModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  year: AcademicYear | null;
}

export default function EditAcademicYearModal({
  open,
  setOpen,
  fetcher,
  year,
}: EditAcademicYearModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'upcoming',
  });
  const [error, setError] = useState<string | null>(null);

  // Re-populate state when modal opens or year changes
  useEffect(() => {
    if (year && open) {
      setFormData({
        name: year.name || '',
        startDate: year.startDate || '',
        endDate: year.endDate || '',
        status: year.status || 'upcoming',
      });
      setError(null);
    }
  }, [year, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  // Close modal on successful server action response
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.action === 'year_update') {
      setOpen(false);
      setError(null);
    }
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, setOpen]);

  if (!year) return null;

  const statusChangedToActive = formData.status === 'active' && year.status !== 'active';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[500px] md:w-[500px]
          p-6 md:p-10
          flex flex-col justify-between
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form
          method="post"
          action="/schools/academic-year"
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="action" value="year_update" />
          <input type="hidden" name="id" value={year.id} />
          <input type="hidden" name="status" value={formData.status} />

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Edit Academic Year
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          {/* SERVER ERROR DISPLAY */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* SCROLLABLE FORM BODY */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Year Name
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. 2025/2026"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Start Date
              </label>
              <Input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                End Date
              </label>
              <Input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => {
                  setFormData({ ...formData, status: value });
                  if (error) setError(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {statusChangedToActive && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                  The currently active year (if any) will be archived automatically.
                </p>
              )}
            </div>
          </div>

          {/* STICKY FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}