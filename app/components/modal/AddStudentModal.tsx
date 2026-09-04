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
import { useLanguage } from '~/lib/i18n';

interface SchoolOption {
  id: number;
  name: string;
}

interface AddStudentModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  classId: string | { id: string } | undefined;
  fetcher: FetcherWithComponents<any>;
  schools?: SchoolOption[];
}

export default function AddStudentModal({
  open,
  setOpen,
  classId,
  fetcher,
  schools = [],
}: AddStudentModalProps) {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    enrollmentDate: '',
    dob: '',
    address: '',
    gender: undefined,
    status: undefined,
    schoolId: undefined,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        enrollmentDate: '',
        dob: '',
        address: '',
        gender: undefined,
        status: undefined,
        schoolId: undefined,
      });
    }
  }, [fetcher.state, fetcher.data]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        enrollmentDate: '',
        dob: '',
        address: '',
        gender: undefined,
        status: undefined,
        schoolId: undefined,
      });
    }
  }, [open]);

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
                  {t('addNewStudent')}
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer mt-2 md:mt-0">
                <X size={24} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-6 md:mb-8">
              {t('addStudentDescription')}
            </p>

            {/* Form fields */}
            <div className="space-y-4">
              {/* School (dynamic, dropdown ya shule) - LAZIMA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('school')} <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.schoolId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, schoolId: value })
                  }
                  name="schoolId"
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectSchool')} />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {schools.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    {t('noSchools')}
                  </p>
                )}
              </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field === 'firstName'
                      ? t('firstName')
                      : field === 'lastName'
                        ? t('lastName')
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
                    value={(formData as any)[field]}
                    onChange={handleChange}
                    required
                  />
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Gender */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('gender')}
                  </label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                    name="gender"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectGender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('male')}</SelectItem>
                      <SelectItem value="female">{t('female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('status')}
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                    name="status"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">{t('pending')}</SelectItem>
                      <SelectItem value="Inactive">{t('inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
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
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? t('adding') : t('addStudent')}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
  
