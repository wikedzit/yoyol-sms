import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { FetcherWithComponents } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

interface SchoolOption {
  id: number;
  name: string;
}

interface CampusOption {
  id: number;
  name: string;
  schoolId: number;
}

interface AddStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classId?: string | { id: string } | undefined;
  fetcher: FetcherWithComponents<any>;
  schools?: SchoolOption[];
  campuses?: CampusOption[];
}

function emptyStudentForm(defaultSchoolId = '') {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    enrollmentDate: '',
    dob: '',
    address: '',
    gender: 'Male',
    status: 'Active',
    schoolId: defaultSchoolId,
    campusId: '',
  };
}

export default function AddStudentModal({
  open,
  setOpen,
  classId,
  fetcher,
  schools = [],
  campuses = [],
}: AddStudentModalProps) {
  const hasCampuses = campuses.length > 0;
  const defaultSchoolId =
    schools.length === 1 ? String(schools[0].id) : '';

  const [formData, setFormData] = useState(emptyStudentForm(defaultSchoolId));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      setFormData(emptyStudentForm(defaultSchoolId));
    }
  }, [fetcher.state, fetcher.data, defaultSchoolId]);

  useEffect(() => {
    if (!open) {
      setFormData(emptyStudentForm(defaultSchoolId));
    }
  }, [open, defaultSchoolId]);

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

            <div className="space-y-4">
              {hasCampuses ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campus <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.campusId}
                    onValueChange={(value) => {
                      const selectedCampus = campuses.find(
                        (campus) => String(campus.id) === value,
                      );
                      setFormData({
                        ...formData,
                        campusId: value,
                        schoolId: selectedCampus
                          ? String(selectedCampus.schoolId)
                          : '',
                      });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map((campus) => (
                        <SelectItem key={campus.id} value={String(campus.id)}>
                          {campus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="hidden"
                    name="campusId"
                    value={formData.campusId}
                  />
                  <input
                    type="hidden"
                    name="schoolId"
                    value={formData.schoolId}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.schoolId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, schoolId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((ownedSchool) => (
                        <SelectItem
                          key={ownedSchool.id}
                          value={String(ownedSchool.id)}
                        >
                          {ownedSchool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="hidden"
                    name="schoolId"
                    value={formData.schoolId}
                  />
                  {schools.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No schools available. Please add a school first.
                    </p>
                  )}
                </div>
              )}

              {(
                [
                  'firstName',
                  'lastName',
                  'email',
                  'phone',
                  'enrollmentDate',
                  'dob',
                  'address',
                ] as const
              ).map((field) => (
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
                    value={formData[field]}
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="gender" value={formData.gender} />
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
                  <input type="hidden" name="status" value={formData.status} />
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
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto  hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
              disabled={
                fetcher.state === 'submitting' ||
                (hasCampuses ? !formData.campusId : !formData.schoolId)
              }
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
 
