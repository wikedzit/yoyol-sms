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

interface EditYearModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  year: any; // year object to edit
}

export default function EditYearModal({
  open,
  setOpen,
  fetcher,
  year,
}: EditYearModalProps) {
  const [formData, setFormData] = useState({
    yearNumber: 1,
    name: '',
  });

  // Populate form with year data when modal opens
  useEffect(() => {
    if (year) {
      setFormData({
        yearNumber: year.yearNumber || 1,
        name: year.name || '',
      });
    }
  }, [year, open]);

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
    });
  };

  // ✅ Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="id" value={year?.id} />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Edit Year
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-8">
              Update the details of the year below.
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

            {/* Description */}
            {/* <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter year description (optional)"
                className="w-full border rounded-md p-2 min-h-[100px]"
                rows={4}
              />
            </div> */}
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
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
