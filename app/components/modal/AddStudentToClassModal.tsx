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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useState, useEffect } from 'react';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import type { LevelType } from '~/type/shools';

interface ClassInfo {
  id: number;
  name: string;
  formId: number;
  streamId: number;
  levelId: number;
  studentCount: number;
  formName: string;
  formNumber: number;
  streamName: string;
  streamColor: 'science' | 'arts' | 'business';
  levelName: string;
  levelType: LevelType;
}

interface AddStudentToClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classInfo: ClassInfo;
  fetcher: any;
}

export default function AddStudentToClassModal({
  open,
  setOpen,
  classInfo,
  fetcher,
}: AddStudentToClassModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [status, setStatus] = useState('Active');

  // Close modal on successful create
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      resetForm();
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      resetForm();
      // Set default enrollment date to today
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setGender('Male');
    setEmail('');
    setPhone('');
    setDob('');
    setEnrollmentDate('');
    setStatus('Active');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('_method', 'POST');
    submitData.append('firstName', firstName);
    submitData.append('lastName', lastName);
    submitData.append('gender', gender);
    submitData.append('status', status);
    if (email) submitData.append('email', email);
    if (phone) submitData.append('phone', phone);
    if (dob) submitData.append('dob', dob);
    if (enrollmentDate) submitData.append('enrollmentDate', enrollmentDate);
    fetcher.submit(submitData, { method: 'post' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[520px] md:w-[520px]
          p-6 md:p-8
          flex flex-col
          overflow-y-auto
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                Add Student
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X
                size={24}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </SheetClose>
          </div>

          {/* Class Context */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{classInfo.name}</span>
              <LevelBadge level={classInfo.levelType} size="sm" />
              <StreamBadge stream={classInfo.streamColor} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              {classInfo.formName} • {classInfo.streamName} • {classInfo.levelName}
            </p>
          </div>

          {/* FORM INPUTS */}
          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10">
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

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@email.com"
                className="h-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Phone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255 xxx xxx xxx"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Enrollment Date
                </label>
                <Input
                  type="date"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 px-6 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white h-10 px-6 w-full sm:w-auto"
              disabled={
                fetcher.state === 'submitting' ||
                !firstName.trim() ||
                !lastName.trim()
              }
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

