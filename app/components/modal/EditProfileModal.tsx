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
import type { FetcherWithComponents } from 'react-router';

interface EditProfileModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  role: string;
  account?: Record<string, any>;
  roleData?: Record<string, any>;
}

export default function EditProfileModal({
  open,
  setOpen,
  fetcher,
  role,
  account,
  roleData,
}: EditProfileModalProps) {
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    qualification: '',
    guardianName: '',
    guardianPhone: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Sync state when account/roleData or open state changes
  useEffect(() => {
    if (open) {
      setFormData({
        firstName: (isTeacher || isStudent ? roleData?.firstName : account?.firstName) || '',
        lastName: (isTeacher || isStudent ? roleData?.lastName : account?.lastName) || '',
        phone: roleData?.phone || '',
        address: roleData?.address || '',
        qualification: (isTeacher && roleData?.qualification) || '',
        guardianName: (isStudent && roleData?.guardianName) || '',
        guardianPhone: (isStudent && roleData?.guardianPhone) || '',
      });
      setError(null);
    }
  }, [open, role, account, roleData, isTeacher, isStudent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.action === 'update_profile') {
      setOpen(false);
      setError(null);
    }
    if (fetcher.data?.error && fetcher.data?.action === 'update_profile') {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, setOpen]);

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

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Edit Profile
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          {/* SERVER ERROR DISPLAY */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
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
                Last Name
              </label>
              <Input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            {(isTeacher || isStudent) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Phone
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
                    Address
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
                  Qualification
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
                    Guardian Name
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
                    Guardian Phone
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

            <p className="text-xs text-muted-foreground pt-2">
              Email can&apos;t be changed here since it&apos;s tied to your
              login. Contact your school admin if it needs to change.
            </p>
          </div>

          {/* STICKY FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}