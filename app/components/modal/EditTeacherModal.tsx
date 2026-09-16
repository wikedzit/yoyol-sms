import { X } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { toTitleCase } from '~/utils/strings';
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

  // Populate form with existing teacher data when modal opens
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

  // Close modal on successful update
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data, setOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formatLabel = (field: string) => {
    if (field === 'firstName') return 'First Name';
    if (field === 'lastName') return 'Last Name';
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full 
          sm:max-w-[420px] 
          md:max-w-[500px] 
          lg:!max-w-[573px] lg:!w-[573px]
          p-6 md:p-10 flex flex-col justify-between
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form
          method="post"
          action="/teachers"
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="_entity" value="teacher" />
          <input type="hidden" name="id" value={teacher?.id || ''} />
          <input type="hidden" name="gender" value={formData.gender} />
          <input type="hidden" name="status" value={formData.status} />

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Edit Teacher
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            Update the teacher’s information below.
          </p>

          {/* SCROLLABLE FORM CONTENT */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
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
                <label className="block text-sm font-medium text-foreground mb-1">
                  {formatLabel(field)}
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
                  required={['firstName', 'lastName', 'subject'].includes(field)}
                />
              </div>
            ))}

            {/* Gender & Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Gender
                </label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
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
          </div>

          {/* STICKY FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
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