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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export default function AddSubjectModal({
  open,
  setOpen,
  fetcher,
  departments,
  id,
}: any) {
  const [formData, setFormData] = useState({
    subjectName: '',
    code: '',
    departments: '',
    instructor: '',
    enrolledStudents: 0,
    // description: '',
    status: 'Active',
    departmentId: id || '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  // Debug log
  useEffect(() => {
    if (open) {
      console.log('AddSubjectModal opened with:', {
        id,
        departments: departments?.length || 0,
        departmentsList: departments,
      });
    }
  }, [open, id, departments]);

  // ✅ Set department name when modal opens with pre-selected department
  useEffect(() => {
    if (open && id && departments) {
      const selectedDept = departments.find(
        (d: any) => String(d.id) === String(id)
      );
      if (selectedDept) {
        setFormData((prev) => ({
          ...prev,
          departmentId: String(id),
          departments: selectedDept.name,
        }));
      }
    }
  }, [open, id, departments]);

  // ✅ Close modal & reset form on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setError(null);
      setFormData({
        subjectName: '',
        code: '',
        departments: '',
        instructor: '',
        enrolledStudents: 0,
        // description: '',
        status: 'Active',
        departmentId: id || '',
      });
    }
    // ✅ Handle error from server
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, id]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form
          method="post"
          action={id ? `/departments/${id}` : '/subjects'}
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="_entity" value="subject" />
          <input type="hidden" name="status" value={formData.status} />
          <input
            type="hidden"
            name="departmentId"
            value={formData.departmentId}
          />
          <input
            type="hidden"
            name="departments"
            value={formData.departments}
          />

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-2xl font-semibold">
                Add New Subject
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={25} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-8">
            Fill in the details below to add a new subject.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            {[
              { label: 'Subject Name', field: 'subjectName', type: 'text' },
              { label: 'Code', field: 'code', type: 'text' },
              { label: 'Instructor', field: 'instructor', type: 'text' },
              {
                label: 'Enrolled Students',
                field: 'enrolledStudents',
                type: 'number',
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

            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => {
                  const selectedDept = departments?.find(
                    (d: any) => String(d.id) === String(value)
                  );
                  setFormData({
                    ...formData,
                    departmentId: value,
                    departments: selectedDept?.name || '',
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {!departments || departments.length === 0 ? (
                    <SelectItem value="no-dept" disabled>
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

            {/* <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter subject description"
                className="w-full border rounded-md p-2"
              />
            </div> */}

            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
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
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Subject'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
