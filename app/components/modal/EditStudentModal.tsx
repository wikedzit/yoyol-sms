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

interface EditStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  student: any;
  classId: string | undefined; // <-- classId prop
}

export default function EditStudentModal({
  open,
  setOpen,
  student,
  classId,
}: EditStudentModalProps) {
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
    gender: 'Select gender',
    status: 'Active',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        course: student.course || '',
        grade: student.grade || '',
        phone: student.phone || '',
        enrollmentDate: student.enrollmentDate || '',
        dob: student.dob || '',
        address: student.address || '',
        gender: student.gender || 'Select gender',
        status: student.status || 'Active',
      });
    }
  }, [student, open]);

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
          <input type="hidden" name="id" value={student?.id} />
          <input
            type="hidden"
            name="classId"
            value={
              classId && typeof classId === 'object' && 'id' in classId
                ? classId.id
                : classId ?? ''
            }
          />
          {/* <-- added */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Edit Student
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>
            <p className="text-sm text-[#898989] mb-8">
              Update the student information below.
            </p>

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
                  {field.charAt(0).toUpperCase() + field.slice(1)}
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
                  required={
                    field === 'firstName' ||
                    field === 'lastName' ||
                    field === 'email'
                  }
                />
              </div>
            ))}
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
                : 'Update Student'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
