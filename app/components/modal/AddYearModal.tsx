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

interface AddYearModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  courseId: number;
  existingYears?: any[]; // To calculate next year number
}

export default function AddYearModal({
  open,
  setOpen,
  fetcher,
  courseId,
  existingYears = [],
}: AddYearModalProps) {
  // Calculate next year number
  const nextYearNumber =
    existingYears.length > 0
      ? Math.max(...existingYears.map((y) => y.yearNumber)) + 1
      : 1;

  const [formData, setFormData] = useState({
    yearNumber: nextYearNumber,
    name: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const nextYear =
        existingYears.length > 0
          ? Math.max(...existingYears.map((y) => y.yearNumber)) + 1
          : 1;
      setFormData({
        yearNumber: nextYear,
        name: `Year ${nextYear}`,
      });
    }
  }, [open, existingYears]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleYearNumberChange = (value: string) => {
    const numValue = parseInt(value) || 1;
    setFormData({
      ...formData,
      yearNumber: numValue,
      name: formData.name || `Year ${numValue}`,
    });
  };

  // ✅ Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setFormData({
        yearNumber: nextYearNumber,
        name: '',
      });
    }
  }, [fetcher.data, setOpen, nextYearNumber]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
      w-full 
      max-w-full 
      sm:max-w-[420px] 
      md:max-w-[500px] 
      lg:!w-[573px] lg:!max-w-[573px]
      p-6 sm:p-8 lg:p-10 
      flex flex-col
    "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="courseId" value={courseId} />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
            {/* Header */}
            <div className="flex flex-wrap justify-between gap-3 items-center mb-6 sm:mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl sm:text-2xl font-semibold">
                  Add New Year
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={24} className="sm:size-[25px]" />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-6 sm:mb-8">
              Fill in the details below to add a new year to this course.
            </p>

            {/* Year Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year Number
              </label>
              <Input
                type="number"
                name="yearNumber"
                value={formData.yearNumber}
                onChange={(e) => handleYearNumberChange(e.target.value)}
                placeholder="Enter year number"
                min="1"
                max="10"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                The sequential number for this year (e.g., 1, 2, 3)
              </p>
            </div>

            {/* Year Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year Name
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter year name (e.g., Year 1, First Year)"
                required
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div
            className="
          flex flex-col-reverse 
          sm:flex-row 
          justify-end 
          gap-3 
          border-t 
          pt-4 
          mt-6 
          sticky bottom-0 
          bg-white
        "
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 sm:px-16 rounded-[8px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto"
              disabled={fetcher.state === 'submitting'}
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Year'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
