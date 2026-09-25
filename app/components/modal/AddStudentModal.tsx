import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";

import type { FetcherWithComponents } from "react-router";

interface Stream {
  id: number;
  name: string;
}

interface FormClass {
  id: number;
  name: string;
  streamId: number;
}

interface CampusOption {
  id: number;
  name: string;
}

interface CampusOption {
  id: number;
  name: string;
  schoolId?: number;
}

interface StreamOption {
  id: number;
  name: string;
}

interface FormOption {
  id: number;
  name: string;
  streamId: number;
}

type AddStudentResult = {
  success?: boolean;
  error?: string;
  student?: any;
};

interface AddStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classId?: string | { id: string } | undefined;
  fetcher: FetcherWithComponents<AddStudentResult>;
  schools?: SchoolOption[];
  campuses?: CampusOption[];
  streams?: StreamOption[];
  forms?: FormOption[];
}

function emptyStudentForm(defaultSchoolId = "") {
  return {
    firstName: "",
    lastName: "",
    admissionNumber: "",
    email: "",
    phone: "",
    enrollmentDate: "",
    dob: "",
    address: "",
    gender: "Male",
    status: "Active",
    schoolId: defaultSchoolId,
    campusId: "",
    streamId: "",
    formId: "",
  };
}

export default function AddStudentModal({
  open,
  setOpen,
  streams = [],
  forms = [],
  fetcher,
  schools = [],
  campuses = [],
  streams = [],
  forms = [],
}: AddStudentModalProps) {
  const hasCampuses = campuses.length > 0;

  const defaultSchoolId =
    schools.length === 1 ? String(schools[0].id) : "";

  const [formData, setFormData] = useState(
    emptyStudentForm(defaultSchoolId)
  );

  const formsInSelectedStream = formData.streamId
    ? forms.filter(
        (academicForm) =>
          String(academicForm.streamId) === formData.streamId
      )
    : [];

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(emptyStudentForm(defaultSchoolId));
  };

  const resolvedClassId =
    classId && typeof classId === "object" && "id" in classId
      ? classId.id
      : classId ?? "";

  const canSubmit =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.admissionNumber.trim().length > 0 &&
    formData.streamId.length > 0 &&
    formData.formId.length > 0 &&
    (hasCampuses
      ? formData.campusId.length > 0
      : formData.schoolId.length > 0);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      resetForm();
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data, setOpen, defaultSchoolId]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, defaultSchoolId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-[calc(100%-1rem)]
          sm:w-full
          sm:max-w-xl
          overflow-y-auto
          px-4
          sm:px-6
          py-6
        "
      >
        <SheetHeader className="px-0">
          <SheetTitle>Add Student</SheetTitle>
          <SheetDescription>
            Fill in the details below to register a new student.
          </SheetDescription>
        </SheetHeader>

        <fetcher.Form method="post" className="mt-6 w-full min-w-0">
          <input type="hidden" name="classId" value={resolvedClassId} />

          {/* Form field fallbacks for reliable browser serialization */}
          <input
            type="hidden"
            name="enrollmentDate"
            value={formData.enrollmentDate}
          />
          <input type="hidden" name="dob" value={formData.dob} />
          <input type="hidden" name="campusId" value={formData.campusId} />
          <input type="hidden" name="schoolId" value={formData.schoolId} />
          <input type="hidden" name="streamId" value={formData.streamId} />
          <input type="hidden" name="formId" value={formData.formId} />
          <input type="hidden" name="gender" value={formData.gender} />
          <input type="hidden" name="status" value={formData.status} />

          <div className="w-full min-w-0 space-y-5">
            {/* Campus / School */}
            {hasCampuses ? (
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Campus <span className="text-red-500">*</span>
                </label>

                <Select
                  value={formData.campusId}
                  onValueChange={(value) => {
                    const selectedCampus = campuses.find(
                      (campus) => String(campus.id) === value
                    );

                    setFormData((prev) => ({
                      ...prev,
                      campusId: value,
                      schoolId: selectedCampus?.schoolId
                        ? String(selectedCampus.schoolId)
                        : prev.schoolId,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>

                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem
                        key={campus.id}
                        value={String(campus.id)}
                      >
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!formData.campusId && (
                  <p className="mt-1 text-xs text-red-500">
                    Please select a campus.
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  School <span className="text-red-500">*</span>
                </label>

                <Select
                  value={formData.schoolId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      schoolId: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
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

                {schools.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    No schools available. Please add a school first.
                  </p>
                )}
              </div>
            )}

            {/* Name */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  First name <span className="text-red-500">*</span>
                </label>

                <Input
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full min-w-0"
                  placeholder="First name"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Last name <span className="text-red-500">*</span>
                </label>

                <Input
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full min-w-0"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Admission Number */}
            <div className="w-full min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Admission number <span className="text-red-500">*</span>
              </label>

              <Input
                name="admissionNumber"
                type="text"
                value={formData.admissionNumber}
                onChange={handleChange}
                required
                className="w-full min-w-0"
                placeholder="Enter admission number"
              />
            </div>

            {/* Contact */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full min-w-0"
                  placeholder="Email address"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone
                </label>

                <Input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full min-w-0"
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Enrollment date
                </label>

                <Input
                  name="enrollmentDate"
                  type="date"
                  value={formData.enrollmentDate}
                  onChange={handleChange}
                  className="w-full min-w-0"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Date of birth
                </label>

                <Input
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full min-w-0"
                />
              </div>
            </div>

            {/* Address */}
            <div className="w-full min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Address
              </label>

              <Input
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                className="w-full min-w-0"
                placeholder="Student address"
              />
            </div>

            {/* Stream / Form */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Stream <span className="text-red-500">*</span>
                </label>

                <Select
                  value={formData.streamId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      streamId: value,
                      formId: "",
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>

                  <SelectContent>
                    {streams.map((stream) => (
                      <SelectItem
                        key={stream.id}
                        value={String(stream.id)}
                      >
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {streams.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    No streams available. Please add a stream first.
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Form <span className="text-red-500">*</span>
                </label>

                <Select
                  value={formData.formId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      formId: value,
                    }))
                  }
                  disabled={!formData.streamId}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue
                      placeholder={
                        formData.streamId
                          ? "Select form"
                          : "Select stream first"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {formsInSelectedStream.map((academicForm) => (
                      <SelectItem
                        key={academicForm.id}
                        value={String(academicForm.id)}
                      >
                        {academicForm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Gender / Status */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Gender
                </label>

                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      gender: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Status
                </label>

                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
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

          {/* Action Buttons */}
          <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setOpen(false)}
              disabled={fetcher.state === "submitting"}
            >
              {t('cancel')}
            </Button>

            <Button
              type="submit"
              className="w-full rounded-[8px] bg-primary-gradient px-5 py-2 text-white transition hover:scale-[1.02] sm:w-auto"
              disabled={fetcher.state === "submitting" || !canSubmit}
            >
              {fetcher.state === "submitting" ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}