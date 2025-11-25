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

interface EditDepartmentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  department: any;
}

export default function EditDepartmentModal({
  open,
  setOpen,
  fetcher,
  department,
}: EditDepartmentModalProps) {
  const [formData, setFormData] = useState({
    faculties: '',
    name: '',
    code: '',
    headOfDepartment: '',
    totalStudent: '',
    establishedDate: '',
    status: 'Active',
    description: '',
  });

  // Load department data when modal opens
  useEffect(() => {
    if (department && open) {
      setFormData({
        faculties: department.faculties || '',
        name: department.name || '',
        code: department.code || '',
        headOfDepartment: department.headOfDepartment || '',
        totalStudent: String(department.totalStudent || ''),
        establishedDate: department.establishedDate || '',
        status: department.status || 'Active',
        description: department.description || '',
      });
    }
  }, [department, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Close modal on successful update
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
      w-full max-w-full p-6 flex flex-col        /* mobile */
      sm:w-[480px] sm:max-w-[480px]             /* tablets */
      md:w-[573px] md:max-w-[573px]             /* desktop */
    "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="id" value={department?.id} />
          <input type="hidden" name="status" value={formData.status} />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex justify-between items-center mb-6">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl md:text-2xl font-semibold">
                  Edit Department
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={22} className="md:size-25" />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-6">
              Update the details of the department below.
            </p>

            {/* Faculties */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Faculty</label>
              <Input
                name="faculties"
                value={formData.faculties}
                onChange={handleChange}
                placeholder="Enter Faculty"
                required
              />
            </div>

            {/* Other Fields */}
            {[
              { label: 'Name', field: 'name', type: 'text' },
              { label: 'Code', field: 'code', type: 'text' },
              {
                label: 'Head of Department',
                field: 'headOfDepartment',
                type: 'text',
              },
              {
                label: 'Total Students',
                field: 'totalStudent',
                type: 'number',
              },
              {
                label: 'Established Date',
                field: 'establishedDate',
                type: 'date',
              },
            ].map(({ label, field, type }) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  {label}
                </label>
                <Input
                  type={type}
                  name={field}
                  value={(formData as any)[field]}
                  placeholder={`Enter ${label}`}
                  onChange={handleChange}
                  required
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
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
                placeholder="Enter department description"
                className="w-full border rounded-md p-2"
                rows={4}
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div
            className="
        flex justify-end gap-3 border-t pt-4 mt-4
        sticky bottom-0 bg-white
        pb-4
      "
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="px-8 md:px-16"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-primary-gradient text-white px-8 md:px-16"
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
