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

interface AddSemesterModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  yearId: number;
  existingSemesters?: any[]; // To calculate next semester number
}

export default function AddSemesterModal({
  open,
  setOpen,
  fetcher,
  yearId,
  existingSemesters = [],
}: AddSemesterModalProps) {
  // Calculate next semester number
  const nextSemesterNumber =
    existingSemesters.length > 0
      ? Math.max(...existingSemesters.map((s) => s.semesterNumber)) + 1
      : 1;

  const [formData, setFormData] = useState({
    semesterNumber: nextSemesterNumber,
    name: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const nextSemester =
        existingSemesters.length > 0
          ? Math.max(...existingSemesters.map((s) => s.semesterNumber)) + 1
          : 1;
      setFormData({
        semesterNumber: nextSemester,
        name: `Semester ${nextSemester}`,
      });
    }
  }, [open, existingSemesters]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSemesterNumberChange = (value: string) => {
    const numValue = parseInt(value) || 1;
    setFormData({
      ...formData,
      semesterNumber: numValue,
      name: formData.name || `Semester ${numValue}`,
    });
  };

  // ✅ Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.semester) {
      setOpen(false);
      setFormData({
        semesterNumber: nextSemesterNumber,
        name: '',
      });
    }
  }, [fetcher.data, setOpen, nextSemesterNumber]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="_entity" value="semester" />
          <input type="hidden" name="yearId" value={yearId} />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Add New Semester
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-8">
              Fill in the details below to add a new semester to this year.
            </p>

            {/* Semester Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester Number
              </label>
              <Input
                type="number"
                name="semesterNumber"
                value={formData.semesterNumber}
                onChange={(e) => handleSemesterNumberChange(e.target.value)}
                placeholder="Enter semester number"
                min="1"
                max="10"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                The sequential number for this semester (e.g., 1, 2)
              </p>
            </div>

            {/* Semester Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester Name
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter semester name (e.g., Semester 1, First Semester)"
                required
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-16 rounded-[8px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
              disabled={fetcher.state === 'submitting'}
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Semester'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
