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

interface EditStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  student: any;
  classId: string | undefined;
  fetcher: FetcherWithComponents<any>;
}

export default function EditStudentModal({
  open,
  setOpen,
  student,
  classId,
  fetcher,
}: EditStudentModalProps) {
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    enrollmentDate: string;
    dob: string;
    address: string;
    gender?: string;
    status: string;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    enrollmentDate: '',
    dob: '',
    address: '',
    gender: undefined,
    status: 'Active',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
        enrollmentDate: student.enrollmentDate || '',
        dob: student.dob || '',
        address: student.address || '',
        gender: student.gender || undefined,
        status: student.status || 'Active',
      });
    }
  }, [student, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formatLabel = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

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
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="id" value={student?.id || ''} />
          <input type="hidden" name="classId" value={classId ?? ''} />
          <input type="hidden" name="gender" value={formData.gender || ''} />
          <input type="hidden" name="status" value={formData.status} />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                  Edit Student
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer mt-2 md:mt-0">
                <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
              </SheetClose>
            </div>

            <p className="text-sm text-muted-foreground mb-6 md:mb-8">
              Update the student information below.
            </p>

            {/* Form Fields */}
            <div className="space-y-4">
              {[
                'firstName',
                'lastName',
                'email',
                'phone',
                'enrollmentDate',
                'dob',
                'address',
              ].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {formatLabel(field)}
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
                    required={
                      field === 'firstName' ||
                      field === 'lastName' ||
                      field === 'email'
                    }
                  />
                </div>
              ))}

              {/* Gender & Status */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
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
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
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
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
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
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
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