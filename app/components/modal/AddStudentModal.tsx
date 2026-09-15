import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { FetcherWithComponents } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { toTitleCase } from "~/utils/strings";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "~/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { useLanguage } from "~/lib/i18n";

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

interface AddStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  streams?: Stream[];
  forms?: FormClass[];
  fetcher: FetcherWithComponents<any>;
  campuses?: CampusOption[];
}

export default function AddStudentModal({
  open,
  setOpen,
  streams = [],
  forms = [],
  fetcher,
  campuses = [],
}: AddStudentModalProps) {
  const { t } = useLanguage();
  const hasCampuses = campuses.length > 0;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    admissionNumber: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    streamId: "",
    formId: "",
    campusId: "",
    gender: "",
    status: "Active",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = ['firstName', 'lastName'].includes(name) ? toTitleCase(value) : value;
    setFormData({ ...formData, [name]: formatted });
  };

  // Close modal and reset form state after successful form submit
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        admissionNumber: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        streamId: "",
        formId: "",
        campusId: "",
        gender: "",
        status: "Active",
      });
    }
  }, [fetcher.data, setOpen]);

  // Filter forms according to selected stream
  const filteredForms = formData.streamId
    ? forms.filter((f) => f.streamId === parseInt(formData.streamId, 10))
    : forms;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full 
          sm:max-w-[420px] 
          md:max-w-[500px] 
          lg:!max-w-[573px] lg:!w-[573px]
          p-6 md:p-10 flex flex-col
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form
          method="post"
          action="/students"
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="_entity" value="student" />

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Add New Student
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X
                size={24}
                className="text-muted-foreground hover:text-foreground"
              />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            Fill in the details below to register a new student.
          </p>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            {/* Campus — required only if at least one campus exists */}
            {hasCampuses ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Campus <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.campusId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, campusId: value })
                  }
                  name="campusId"
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  name="campusId"
                  value={formData.campusId}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                No campus added yet — this student will be added to your default
                school.
              </p>
            )}

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name *
              </label>
              <Input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter First Name"
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Last Name *
              </label>
              <Input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter Last Name"
                required
              />
            </div>

            {/* Admission Number */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Admission Number *
              </label>
              <Input
                type="text"
                name="admissionNumber"
                value={formData.admissionNumber}
                onChange={handleChange}
                placeholder="Enter Admission Number"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email Address
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter Email Address"
              />
            </div>

            {/* Phone & Date of Birth */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter Phone Number"
                />
              </div>

              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Stream & Form Class Selects */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Stream *
                </label>
                <Select
                  value={formData.streamId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, streamId: val, formId: "" })
                  }
                  name="streamId"
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map((stream) => (
                      <SelectItem key={stream.id} value={String(stream.id)}>
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  name="streamId"
                  value={formData.streamId}
                />
              </div>

              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Form *
                </label>
                <Select
                  value={formData.formId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, formId: val })
                  }
                  name="formId"
                  disabled={!formData.streamId}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        formData.streamId
                          ? "Select form"
                          : "Select stream first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredForms.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="formId" value={formData.formId} />
              </div>
            </div>

            {/* Gender & Status Selects */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Gender *
                </label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                  name="gender"
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="gender" value={formData.gender} />
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
                  name="status"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="status" value={formData.status} />
              </div>
            </div>
          </div>

          {/* Sticky Footer - Theme Adaptive */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state === "submitting"}
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === "submitting" ? t("adding") : t("addStudent")}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
