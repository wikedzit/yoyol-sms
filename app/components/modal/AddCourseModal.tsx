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

export default function AddCourseModal({
  open,
  setOpen,
  fetcher,
  departments,
}: any) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    duration: '',
    totalStudent: 0,
    status: 'Active',
    description: '',
    departmentId: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setFormData({
        name: '',
        code: '',
        duration: '',
        totalStudent: 0,
        status: 'Active',
        description: '',
        departmentId: '',
      });
    }
  }, [fetcher.data, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full          /* Mobile full-screen */
          sm:max-w-[90%]             /* Tablet */
          md:max-w-[573px] md:w-[573px] /* Desktop fixed width */
          p-6 md:p-10
          flex flex-col
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          <input
            type="hidden"
            name="departmentId"
            value={formData.departmentId}
          />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl md:text-2xl font-semibold">
                  Add New Course
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer mt-2 md:mt-0">
                <X size={24} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-6 md:mb-8">
              Fill in the details below to add a new course.
            </p>

            {/* Department Dropdown */}
            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {!departments || departments.length === 0 ? (
                    <SelectItem value="no-department" disabled>
                      No departments available
                    </SelectItem>
                  ) : (
                    departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Other Fields */}
            {[
              { label: 'Name', field: 'name', type: 'text' },
              { label: 'Code', field: 'code', type: 'text' },
              {
                label: 'Duration',
                field: 'duration',
                type: 'text',
                placeholder: 'e.g., 4 Years',
              },
              {
                label: 'Total Students',
                field: 'totalStudent',
                type: 'number',
              },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <Input
                  type={type}
                  name={field}
                  value={(formData as any)[field]}
                  placeholder={placeholder || `Enter ${label}`}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

            {/* Status */}
            <div className="mb-4 w-full">
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

            {/* Description */}
            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter course description"
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto"
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Course'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
