import { X, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
import { useLanguage } from '~/lib/i18n';

export default function EditProfileModal({
  open,
  setOpen,
  fetcher,
  role,
  account,
  roleData,
  onLanguageChange,
}: any) {
  const { t } = useLanguage();
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: (isTeacher || isStudent ? roleData?.firstName : account?.firstName) || '',
    lastName: (isTeacher || isStudent ? roleData?.lastName : account?.lastName) || '',
    phone: roleData?.phone || '',
    accountPhone: account?.phone || '',
    address: roleData?.address || '',
    qualification: (isTeacher && roleData?.qualification) || '',
    guardianName: (isStudent && roleData?.guardianName) || '',
    guardianPhone: (isStudent && roleData?.guardianPhone) || '',
    preferredLanguage: account?.preferredLanguage || 'en',
    avatarUrl: account?.avatarUrl || '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError(t('pictureHelp'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 320;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        setFormData((current) => ({
          ...current,
          avatarUrl: canvas.toDataURL('image/jpeg', 0.82),
        }));
        setError(null);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setFormData((current) => ({ ...current, avatarUrl: '' }));
    // Clear the file input's selection too, so choosing the same file
    // again still fires onChange (otherwise the browser treats it as
    // "no change" and handleAvatarChange never runs).
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (error) setError(null);
  };

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.action === 'update_profile') {
      onLanguageChange?.(formData.preferredLanguage);
      setOpen(false);
      setError(null);
    }
    if (fetcher.data?.error && fetcher.data?.action === 'update_profile') {
      setError(fetcher.data.error);
    }
  }, [fetcher.data]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[500px] md:w-[500px]
          p-6 md:p-10
          flex flex-col
        "
      >
        <fetcher.Form
          method="post"
          action="/profile"
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="action" value="update_profile" />
          <input type="hidden" name="avatarUrl" value={formData.avatarUrl} />

          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                {t('editProfile')}
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={25} />
            </SheetClose>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt={t('profilePicture')} className="h-full w-full object-cover" />
                ) : (
                  (formData.firstName || formData.lastName || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="space-y-1 flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('profilePicture')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    className="flex-1"
                  />
                  {formData.avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveAvatar}
                      className="shrink-0 px-3 py-2 rounded-[8px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      aria-label={t('removePicture') || 'Remove picture'}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('pictureHelp')}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName')}
              </label>
              <Input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName')}
              </label>
              <Input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            {!isTeacher && !isStudent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('phone')}
                </label>
                <Input
                  type="text"
                  name="accountPhone"
                  value={formData.accountPhone}
                  onChange={handleChange}
                />
              </div>
            )}

            {(isTeacher || isStudent) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('phone')}
                  </label>
                  <Input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('address')}
                  </label>
                  <Input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {isTeacher && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('qualification')}
                </label>
                <Input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                />
              </div>
            )}

            {isStudent && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('guardianName')}
                  </label>
                  <Input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('guardianPhone')}
                  </label>
                  <Input
                    type="text"
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('preferredLanguage')}
              </label>
              <Select
                value={formData.preferredLanguage}
                onValueChange={(value) =>
                  setFormData({ ...formData, preferredLanguage: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('english')}</SelectItem>
                  <SelectItem value="sw">{t('swahili')}</SelectItem>
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="preferredLanguage"
                value={formData.preferredLanguage}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t('emailCannotChange')}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]  hover:scale-110 hover:text-white-600 transition cursor-pointer">
            
              {fetcher.state === 'submitting' ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}