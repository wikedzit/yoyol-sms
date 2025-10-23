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

export default function EditTeacherModal({
  open,
  setOpen,
  teacher,
  fetcher,
}: any) {
  const [formData, setFormData] = useState({
    teacherID: '',
    firstName: '',
    lastName: '',
    subject: '',
    email: '',
    phone: '',
    address: '',
    qualification: '',
    gender: '',
    experience: '',
    status: '',
  });

  // ✅ Populate form with existing teacher data when modal opens
  useEffect(() => {
    if (teacher) {
      setFormData({
        teacherID: teacher.teacherID || '',
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        subject: teacher.subject || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        address: teacher.address || '',
        qualification: teacher.qualification || '',
        gender: teacher.gender || '',
        experience: teacher.experience?.toString() || '',
        status: teacher.status || 'Active',
      });
    }
  }, [teacher, open]);

  // ✅ Close modal on successful update
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col justify-between"
      >
        <fetcher.Form
          method="post"
          className="flex flex-col justify-between h-full"
        >
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="id" value={teacher?.id} />

          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-2xl font-semibold">
                Edit Teacher
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={25} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-8">
            Update the teacher’s information below.
          </p>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto pr-2">
            {[
              'firstName',
              'lastName',
              'subject',
              'email',
              'phone',
              'address',
              'qualification',
              'experience',
            ].map((field) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field === 'firstName'
                    ? 'First Name'
                    : field === 'lastName'
                    ? 'Last Name'
                    : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <Input
                  type={
                    field === 'email'
                      ? 'email'
                      : field === 'experience'
                      ? 'number'
                      : 'text'
                  }
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                  required={['firstName', 'lastName', 'subject'].includes(
                    field
                  )}
                />
              </div>
            ))}

            {/* Gender Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData({ ...formData, gender: value })
                }
                name="gender"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Select */}
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
          </div>

          {/* STICKY FOOTER */}
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
              {fetcher.state === 'submitting'
                ? 'Updating...'
                : 'Update Teacher'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
