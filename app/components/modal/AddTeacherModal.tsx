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

export default function AddTeacherModal({ open, setOpen, fetcher }: any) {
  const [formData, setFormData] = useState({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Close modal & reset form after successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setFormData({
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

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-2xl font-semibold">
                Add New Teacher
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={25} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-8">
            Fill in the details below to register a new teacher.
          </p>

          {/* Scrollable Form Content */}
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
                  type={field === 'email' ? 'email' : 'text'}
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                  placeholder={
                    'Enter ' +
                    (field === 'firstName'
                      ? 'First Name'
                      : field === 'lastName'
                      ? 'Last Name'
                      : field.charAt(0).toUpperCase() + field.slice(1))
                  }
                  required={[
                    'firstName',
                    'firstName',
                    'lastName',
                    'subject',
                  ].includes(field)}
                />
              </div>
            ))}

            {/* Gender & Status Selects */}
            <div className="flex items-center justify-between gap-4">
              <div className="mb-4 w-full">
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
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Teacher'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
