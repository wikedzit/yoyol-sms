import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';

export default function AddAcademicYearModal({
  open,
  setOpen,
  fetcher,
}: any) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    makeActive: false,
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.action === 'year_create') {
      setOpen(false);
      setError(null);
      setFormData({ name: '', startDate: '', endDate: '', makeActive: false });
    }
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[500px] md:w-[500px]
          p-6 md:p-10
          flex flex-col
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form
          method="post"
          action="/schools/academic-year"
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="action" value="year_create" />
          <input
            type="hidden"
            name="status"
            value={formData.makeActive ? 'active' : 'upcoming'}
          />

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Add Academic Year
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={25} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            Define a new academic year with its start and end dates.
          </p>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Year Name
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                placeholder="e.g. 2026/2027"
                onChange={handleChange}
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

            <label className="flex items-center gap-2 text-sm text-foreground my-4 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.makeActive}
                onChange={(e) =>
                  setFormData({ ...formData, makeActive: e.target.checked })
                }
                className="rounded border-border text-primary focus:ring-ring"
              />
              Make this the active academic year
            </label>
            {formData.makeActive && (
              <p className="text-xs text-amber-600 dark:text-amber-400 -mt-2 mb-4">
                The currently active year (if any) will be archived automatically.
              </p>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6 sticky bottom-0 bg-card z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Academic Year'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}