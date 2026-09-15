import { X, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { useLanguage } from '~/lib/i18n';
import { isAdminRole } from '~/lib/permissions';

interface EditProfileModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<{
    success?: boolean;
    error?: string;
    action?: string;
  }>;
  role: string;
  account?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    preferredLanguage?: string | null;
    avatarUrl?: string | null;
    jobTitle?: string | null;
    staffId?: string | null;
    bio?: string | null;
  };
  roleData?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    address?: string | null;
    qualification?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
  };
  onLanguageChange?: (value: string) => void;
}

export default function EditProfileModal({
  open,
  setOpen,
  fetcher,
  role,
  account,
  roleData,
  onLanguageChange,
}: EditProfileModalProps) {
  const { t } = useLanguage();
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isAdmin = isAdminRole(role);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    accountPhone: '',
    address: '',
    qualification: '',
    guardianName: '',
    guardianPhone: '',
    preferredLanguage: 'en',
    avatarUrl: '',
    jobTitle: '',
    staffId: '',
    bio: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setFormData({
      firstName:
        (isTeacher || isStudent ? roleData?.firstName : account?.firstName) ||
        '',
      lastName:
        (isTeacher || isStudent ? roleData?.lastName : account?.lastName) || '',
      phone: roleData?.phone || '',
      accountPhone: account?.phone || '',
      address: roleData?.address || '',
      qualification: (isTeacher && roleData?.qualification) || '',
      guardianName: (isStudent && roleData?.guardianName) || '',
      guardianPhone: (isStudent && roleData?.guardianPhone) || '',
      preferredLanguage: account?.preferredLanguage || 'en',
      avatarUrl: account?.avatarUrl || '',
      jobTitle: account?.jobTitle || '',
      staffId: account?.staffId || '',
      bio: account?.bio || '',
    });
    setError(null);
  }, [open, role, account, roleData, isTeacher, isStudent]);

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
  }, [fetcher.data, formData.preferredLanguage, onLanguageChange, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[500px] md:w-[500px]
          p-6 md:p-10
          flex flex-col justify-between
          bg-card text-card-foreground border-border
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
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                {t('editProfile')}
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X
                size={24}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </SheetClose>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt={t('profilePicture')}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (formData.firstName || formData.lastName || 'U')
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
              <div className="space-y-1 flex-1">
                <label className="block text-sm font-medium text-foreground">
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveAvatar}
                          className="shrink-0 px-3 py-2 rounded-[8px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          aria-label={t('removePicture')}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={6}
                        className="z-[60]"
                      >
                        {t('removePicture')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('pictureHelp')}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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
              <label className="block text-sm font-medium text-foreground mb-1">
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
                <label className="block text-sm font-medium text-foreground mb-1">
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

            {isAdmin && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Job title
                  </label>
                  <Input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    placeholder="Head of admissions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Staff ID
                  </label>
                  <Input
                    type="text"
                    name="staffId"
                    value={formData.staffId}
                    onChange={handleChange}
                    placeholder="STF-0231"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={(event) =>
                      setFormData({ ...formData, bio: event.target.value })
                    }
                    rows={4}
                    maxLength={500}
                    className="flex min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    placeholder="A short description of your responsibilities"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.bio.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            {(isTeacher || isStudent) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                  <label className="block text-sm font-medium text-foreground mb-1">
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
              <label className="block text-sm font-medium text-foreground mb-1">
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

            <p className="text-xs text-muted-foreground pt-2">
              {t('emailCannotChange')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
