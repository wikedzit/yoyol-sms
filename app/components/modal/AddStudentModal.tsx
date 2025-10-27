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
import { useFetcher } from 'react-router-dom';

interface AddStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classId: string | { id: string } | undefined; // <-- accept classId
}

export default function AddStudentModal({
  open,
  setOpen,
  classId,
}: AddStudentModalProps) {
  const fetcher = useFetcher();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    course: '',
    grade: '',
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

  // ✅ Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        course: '',
        grade: '',
        phone: '',
        enrollmentDate: '',
        dob: '',
        address: '',
        gender: undefined,
        status: undefined,
      });
    }
  }, [fetcher.data]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          {/* <-- hidden input for classId */}

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
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Add New Student
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-8">
              Fill in the details below to register a new student.
            </p>

            {/* Form Fields */}
            {[
              'firstName',
              'lastName',
              'email',
              'course',
              'grade',
              'phone',
              'enrollmentDate',
              'dob',
              'address',
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
                      : field === 'enrollmentDate'
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
            <div className="flex items-center justify-between">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      gender: value,
                    })
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value,
                    })
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
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
