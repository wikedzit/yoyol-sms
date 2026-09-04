import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';
import { useLanguage } from '~/lib/i18n';

export default function AddTeacherModal({ open, setOpen, fetcher }: any) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '',
    gender: '', experience: '', status: '', qualification: '', subject: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', address: '', gender: '', experience: '', status: '', qualification: '', subject: '' });
    }
  }, [fetcher.data, setOpen]);

  const fieldLabel = (field: string) =>
    field === 'firstName' ? t('firstName') : field === 'lastName' ? t('lastName') :
    field === 'subject' ? t('subjects') : field === 'email' ? t('email') :
    field === 'phone' ? t('phone') : field === 'address' ? t('address') :
    field === 'qualification' ? t('qualification') : field === 'experience' ? 'Experience' : field;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full max-w-full sm:max-w-[420px] md:max-w-[500px] lg:!max-w-[573px] lg:!w-[573px] p-6 md:p-10 flex flex-col">
        <fetcher.Form method="post" action="/teachers" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="_entity" value="teacher" />
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0"><SheetTitle className="text-xl md:text-2xl font-semibold">{t('addNewTeacher')}</SheetTitle></SheetHeader>
            <SheetClose asChild className="cursor-pointer"><X size={24} /></SheetClose>
          </div>
          <p className="text-sm text-[#898989] mb-6 md:mb-8">{t('teacherDescription')}</p>
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            {['firstName', 'lastName', 'subject', 'email', 'phone', 'address', 'qualification', 'experience'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{fieldLabel(field)}</label>
                <Input type={field === 'email' ? 'email' : field === 'experience' ? 'number' : 'text'} name={field} value={(formData as any)[field]} onChange={handleChange} placeholder={`${t('enter')} ${fieldLabel(field)}`} required={['firstName', 'lastName', 'subject'].includes(field)} />
              </div>
            ))}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="mb-4 w-full sm:w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('gender')}</label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })} name="gender"><SelectTrigger><SelectValue placeholder={t('selectGender')} /></SelectTrigger><SelectContent><SelectItem value="Male">{t('male')}</SelectItem><SelectItem value="Female">{t('female')}</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
              </div>
              <div className="mb-4 w-full sm:w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })} name="status"><SelectTrigger><SelectValue placeholder={t('selectStatus')} /></SelectTrigger><SelectContent><SelectItem value="Active">{t('active')}</SelectItem><SelectItem value="Inactive">{t('inactive')}</SelectItem></SelectContent></Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4 bg-white sticky bottom-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto">{t('cancel')}</Button>
            <Button type="submit" className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto">{fetcher.state === 'submitting' ? t('adding') : t('addTeacher')}</Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
