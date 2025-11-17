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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

interface AddFacultyModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
}

export default function AddFacultyModal({
  open,
  setOpen,
  fetcher,
}: AddFacultyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    dean: '',
    status: 'active',
    description: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Reset when success
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setFormData({
        name: '',
        code: '',
        dean: '',
        status: 'active',
        description: '',
      });
    }
  }, [fetcher.data, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Add New Faculty
                </SheetTitle>
              </SheetHeader>

              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-8">
              Fill in the details below to add a new faculty.
            </p>

            {/* Input fields */}
            {[
              { label: 'Name', field: 'name' },
              { label: 'Code', field: 'code' },
              { label: 'Dean', field: 'dean' },
            ].map(({ label, field }) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  {label}
                </label>
                <Input
                  name={field}
                  value={(formData as any)[field]}
                  placeholder={`Enter ${label}`}
                  onChange={handleChange}
                  required={field !== 'dean'}
                />
              </div>
            ))}

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                name="status"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={formData.status} />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter faculty description"
                className="w-full border rounded-md p-2"
                rows={4}
              />
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-6 bg-white sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button type="submit" className="bg-primary-gradient text-white">
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Faculty'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
