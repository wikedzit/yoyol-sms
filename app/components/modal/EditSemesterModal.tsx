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

interface EditSemesterModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  semester: any;
}

export default function EditSemesterModal({
  open,
  setOpen,
  fetcher,
  semester,
}: EditSemesterModalProps) {
  const [formData, setFormData] = useState({
    semesterNumber: 1,
    name: '',
  });

  // Pre-fill form data when modal opens
  useEffect(() => {
    if (semester) {
      setFormData({
        semesterNumber: semester.semesterNumber || 1,
        name: semester.name || '',
      });
    }
  }, [semester, open]);

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
    });
  };

  // ✅ Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.semester) {
      setOpen(false);
    }
  }, [fetcher.data, setOpen]);

  if (!semester) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="_entity" value="semester" />
          <input type="hidden" name="id" value={semester.id} />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Edit Semester
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-8">
              Update the information for this semester below.
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
                placeholder="Enter semester name"
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
              {fetcher.state === 'submitting' ? 'Updating...' : 'Update Semester'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}

