import { ChevronDown, X } from 'lucide-react';
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

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

interface SubjectOption {
  id: number;
  subjectName: string;
  code: string;
  status?: string | null;
}

interface CampusOption {
  id: number;
  name: string;
  code?: string | null;
  isMain?: boolean;
}

export default function AddTeacherModal({
  open,
  setOpen,
  fetcher,
  subjects,
  campuses = [],
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  subjects: SubjectOption[];
  campuses?: CampusOption[];
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    subject: '',
    subjectIds: [] as number[],
    email: '',
    phone: '',
    address: '',
    qualification: '',
    gender: '',
    experience: '',
    status: '',
    campusId: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleSubject = (subjectId: number) => {
    const subjectIds = formData.subjectIds.includes(subjectId)
      ? formData.subjectIds.filter(
          (id) => id !== subjectId
        )
      : [
          ...formData.subjectIds,
          subjectId,
        ];

    setFormData({
      ...formData,
      subjectIds,
      subject: subjects
        .filter((subject) =>
          subjectIds.includes(subject.id)
        )
        .map((subject) => subject.subjectName)
        .join(', '),
    });
  };

  // Close modal and reset form
  // after successful submission.
  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success
    ) {
      setOpen(false);

      setFormData({
        firstName: '',
        lastName: '',
        subject: '',
        subjectIds: [],
        email: '',
        phone: '',
        address: '',
        qualification: '',
        gender: '',
        experience: '',
        status: '',
        campusId: '',
      });
    }
  }, [
    fetcher.state,
    fetcher.data,
    setOpen,
  ]);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
    >
      <SheetContent
        side="right"
        className="
          w-full
          max-w-full
          sm:max-w-[420px]
          md:max-w-[500px]
          lg:!max-w-[573px]
          lg:!w-[573px]
          p-6
          md:p-10
          flex
          flex-col
        "
      >
        <fetcher.Form
          method="post"
          action="/teachers"
          className="flex flex-col h-full"
        >
          <input
            type="hidden"
            name="_method"
            value="POST"
          />

          <input
            type="hidden"
            name="_entity"
            value="teacher"
          />

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                Add New Teacher
              </SheetTitle>
            </SheetHeader>

            <SheetClose
              asChild
              className="cursor-pointer"
            >
              <X size={24} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-6 md:mb-8">
            Fill in the details below to register
            a new teacher.
          </p>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">

                        {/* Campus */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campus{' '}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <Select
                value={formData.campusId}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    campusId: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>

                <SelectContent>
                  {campuses.length === 0 ? (
                    <SelectItem
                      value="no-campus"
                      disabled
                    >
                      No campuses available
                    </SelectItem>
                  ) : (
                    campuses.map((campus) => (
                      <SelectItem
                        key={campus.id}
                        value={String(campus.id)}
                      >
                        {campus.name}

                        {campus.isMain
                          ? ' (Main Campus)'
                          : ''}

                        {campus.code
                          ? ` - ${campus.code}`
                          : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <input
                type="hidden"
                name="campusId"
                value={formData.campusId}
              />
            </div>

            {/* Basic Teacher Information */}
            {[
              'firstName',
              'lastName',
              'email',
              'phone',
              'address',
              'qualification',
              'experience',
            ].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field === 'firstName'
                    ? 'First Name'
                    : field === 'lastName'
                      ? 'Last Name'
                      : field.charAt(0).toUpperCase() +
                        field.slice(1)}

                  {['firstName', 'lastName'].includes(
                    field
                  ) && (
                    <span className="text-red-500">
                      *
                    </span>
                  )}
                </label>

                <Input
                  type={
                    field === 'email'
                      ? 'email'
                      : 'text'
                  }
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                  placeholder={
                    'Enter ' +
                    (field === 'firstName'
                      ? 'First Name'
                      : field === 'lastName'
                        ? 'Last Name'
                        : field.charAt(0).toUpperCase() +
                          field.slice(1))
                  }
                  required={[
                    'firstName',
                    'lastName',
                  ].includes(field)}
                />
              </div>
            ))}

            {/* Subjects */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subjects
              </label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {formData.subjectIds.length > 0
                        ? formData.subject
                        : 'Select subjects'}
                    </span>

                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {subjects.length === 0 ? (
                    <DropdownMenuCheckboxItem
                      checked={false}
                      disabled
                    >
                      No subjects available
                    </DropdownMenuCheckboxItem>
                  ) : (
                    subjects.map((subject) => (
                      <DropdownMenuCheckboxItem
                        key={subject.id}
                        checked={formData.subjectIds.includes(
                          subject.id
                        )}
                        onSelect={(event) =>
                          event.preventDefault()
                        }
                        onCheckedChange={() =>
                          toggleSubject(subject.id)
                        }
                      >
                        {subject.subjectName} (
                        {subject.code})
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                type="hidden"
                name="subjectIds"
                value={JSON.stringify(
                  formData.subjectIds
                )}
              />
            </div>



            {/* Gender & Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

              {/* Gender */}
              <div className="mb-4 w-full sm:w-1/2">
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Male">
                      Male
                    </SelectItem>

                    <SelectItem value="Female">
                      Female
                    </SelectItem>

                    <SelectItem value="Other">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>

                <input
                  type="hidden"
                  name="gender"
                  value={formData.gender}
                />
              </div>

              {/* Status */}
              <div className="mb-4 w-full sm:w-1/2">
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Active">
                      Active
                    </SelectItem>

                    <SelectItem value="Inactive">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>

                <input
                  type="hidden"
                  name="status"
                  value={formData.status}
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4 bg-white sticky bottom-0">

            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="
                py-2
                px-10
                md:px-16
                rounded-[8px]
                w-full
                sm:w-auto
                hover:scale-110
                hover:text-white-600
                transition
                cursor-pointer
              "
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                fetcher.state === 'submitting' ||
                !formData.campusId
              }
              className="
                bg-primary-gradient
                text-white
                py-2
                px-6
                md:px-8
                rounded-[8px]
                w-full
                sm:w-auto
                hover:scale-110
                hover:text-white-600
                transition
                cursor-pointer
              "
            >
              {fetcher.state === 'submitting'
                ? 'Adding...'
                : 'Add Teacher'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}