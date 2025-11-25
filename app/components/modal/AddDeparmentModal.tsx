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

export default function AddDepartmentModal({
  open,
  setOpen,
  fetcher,
  faculties,
}: any) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    headOfDepartment: '',
    totalStudent: 0,
    establishedDate: '',
    status: 'Active',
    description: '',
    facultyId: '',
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
        headOfDepartment: '',
        totalStudent: 0,
        establishedDate: '',
        status: 'Active',
        description: '',
        facultyId: '',
      });
    }
  }, [fetcher.data]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[450px]
          md:max-w-[500px]
          lg:!w-[573px] lg:!max-w-[573px]
          p-6 sm:p-8 md:p-10
          flex flex-col
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="facultyId" value={formData.facultyId} />

          {/* Scrollable section */}
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
            <div className="flex justify-between items-center mb-6">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl sm:text-2xl font-semibold">
                  Add New Department
                </SheetTitle>
              </SheetHeader>

              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-6 sm:mb-8">
              Fill in the details below to add a new department.
            </p>

            {/* Faculty dropdown */}
            <div className="mb-4 w-full">
              <label className="block text-sm font-medium mb-1">Faculty</label>
              <Select
                value={formData.facultyId}
                onValueChange={(value) => {
                  const selectedFaculty = faculties?.find(
                    (f: any) => String(f.id) === String(value)
                  );
                  setFormData({
                    ...formData,
                    facultyId: value,
                    facultyName: selectedFaculty?.name || '',
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Faculty" />
                </SelectTrigger>

                <SelectContent>
                  {(!faculties || faculties.length === 0) && (
                    <SelectItem disabled value="none">
                      No faculties available
                    </SelectItem>
                  )}

                  {faculties?.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={String(faculty.id)}>
                      {faculty.name} ({faculty.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inputs */}
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

          {/* Sticky footer */}
          <div
            className="
              flex flex-col sm:flex-row justify-end 
              gap-3 pt-4 border-t mt-6 bg-white 
              sticky bottom-0 pb-4
            "
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-primary-gradient text-white w-full sm:w-auto"
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Department'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
