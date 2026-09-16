import { X, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { FetcherWithComponents } from 'react-router';
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
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import type { LevelType } from '~/type/shools';

interface ClassInfo {
  id: number;
  name: string;
  formId?: number;
  streamId?: number;
  levelId?: number;
  studentCount?: number;
  formName: string;
  formNumber?: number;
  streamName: string;
  streamColor: 'science' | 'arts' | 'business';
  levelName: string;
  levelType: LevelType;
}

interface AddStudentToClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classInfo: ClassInfo;
  fetcher: FetcherWithComponents<any>;
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

  const isSubmitting = fetcher.state === 'submitting';

  // Reset form helper
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

  // Close modal on successful server action
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      resetForm();
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  // Sync state when drawer is triggered
  useEffect(() => {
    if (open) {
      resetForm();
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('_method', 'POST');
    submitData.append('action', 'add_student');
    submitData.append('classId', String(classInfo.id));
    submitData.append('firstName', firstName.trim());
    submitData.append('lastName', lastName.trim());
    submitData.append('gender', gender);
    submitData.append('status', status);
    
    if (email.trim()) submitData.append('email', email.trim());
    if (phone.trim()) submitData.append('phone', phone.trim());
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
          md:max-w-[540px] md:w-[540px]
          p-6 md:p-8
          flex flex-col justify-between
          bg-card text-card-foreground border-border
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4 shrink-0">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add Student
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X
                size={22}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </SheetClose>
          </div>

          {/* CLASS CONTEXT DISPLAY */}
          <div className="bg-muted/40 border border-border rounded-lg p-3.5 mb-5 shrink-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-semibold text-foreground">{classInfo.name}</span>
              <LevelBadge level={classInfo.levelType} size="sm" />
              <StreamBadge stream={classInfo.streamColor} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              {classInfo.formName} &bull; {classInfo.streamName} &bull; {classInfo.levelName}
            </p>
          </div>

          {/* FORM INPUTS SCROLL CONTAINER */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Baraka"
                  required
                  className="h-10 bg-background border-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Mushi"
                  required
                  className="h-10 bg-background border-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Gender <span className="text-destructive">*</span>
                </label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-10 w-full bg-background border-input">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 w-full bg-background border-input">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="h-10 bg-background border-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255 7xx xxx xxx"
                  className="h-10 bg-background border-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-10 bg-background border-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Enrollment Date
                </label>
                <Input
                  type="date"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                  className="h-10 bg-background border-input"
                />
              </div>
            </div>
          </div>

          {/* STICKY ACTION FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 shrink-0 bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="h-10 px-6 w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !firstName.trim() ||
                !lastName.trim()
              }
              className="h-10 px-6 w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {isSubmitting ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}