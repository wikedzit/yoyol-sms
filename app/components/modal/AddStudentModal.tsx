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
import type { FetcherWithComponents } from 'react-router';

interface AddStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classId: string | { id: string } | undefined;
  fetcher: FetcherWithComponents<any>;
}

export default function AddStudentModal({
  open,
  setOpen,
  classId,
  fetcher,
}: AddStudentModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    course: '',
    phone: '',
    enrollmentDate: '',
    dob: '',
    address: '',
    gender: undefined,
    status: undefined,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        course: '',
        phone: '',
        enrollmentDate: '',
        dob: '',
        address: '',
        gender: undefined,
        status: undefined,
      });
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full              /* Mobile full-screen */
          sm:max-w-[90%]                 /* Tablet */
          md:max-w-[573px] md:w-[573px]  /* Desktop fixed width */
          p-6 md:p-10
          flex flex-col justify-between
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          <input
            type="hidden"
            name="classId"
            value={
              classId && typeof classId === 'object' && 'id' in classId
                ? classId.id
                : classId ?? ''
            }
          />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl md:text-2xl font-semibold">
                  Add New Student
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer mt-2 md:mt-0">
                <X size={24} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-6 md:mb-8">
              Fill in the details below to register a new student.
            </p>

            {/* Form fields */}
            <div className="space-y-4">
              {[
                'firstName',
                'lastName',
                'email',
                'course',
                'phone',
                'enrollmentDate',
                'dob',
                'address',
              ].map((field) => (
                <div key={field}>
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
                        : ['enrollmentDate', 'dob'].includes(field)
                        ? 'date'
                        : 'text'
                    }
                    name={field}
                    value={(formData as any)[field]}
                    onChange={handleChange}
                    required
                  />
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Gender */}
                <div className="flex-1">
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
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex-1">
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
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
