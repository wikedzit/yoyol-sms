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
  department: any; // department object to edit
}

export default function EditDepartmentModal({
  open,
  setOpen,
  fetcher,
  department,
}: EditDepartmentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    headOfDepartment: '',
    totalStudent: 0,
    totalFaculty: 0,
    establishedDate: '',
    status: 'Active',
    description: '',
  });

  // Populate form with department data when modal opens
  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        code: department.code || '',
        headOfDepartment: department.headOfDepartment || '',
        totalStudent: department.totalStudent || 0,
        totalFaculty: department.totalFaculty || 0,
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

  // ✅ Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="id" value={department?.id} />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Edit Department
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-8">
              Update the details of the department below.
            </p>

            {/* Form Fields */}
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
              { label: 'Total Faculty', field: 'totalFaculty', type: 'number' },
              {
                label: 'Established Date',
                field: 'establishedDate',
                type: 'date',
              },
            ].map(({ label, field, type }) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
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
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter department description"
                className="w-full border rounded-md p-2"
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
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
