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

export default function EditProfileModal({
  open,
  setOpen,
  fetcher,
  role,
  account,
  roleData,
}: any) {
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const [formData, setFormData] = useState({
    firstName: (isTeacher || isStudent ? roleData?.firstName : account?.firstName) || '',
    lastName: (isTeacher || isStudent ? roleData?.lastName : account?.lastName) || '',
    phone: roleData?.phone || '',
    address: roleData?.address || '',
    qualification: (isTeacher && roleData?.qualification) || '',
    guardianName: (isStudent && roleData?.guardianName) || '',
    guardianPhone: (isStudent && roleData?.guardianPhone) || '',
  });
  const [error, setError] = useState<string | null>(null);

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

          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                Edit Profile
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <p className="text-xs text-muted-foreground">
              Email can&apos;t be changed here since it&apos;s tied to your
              login. Contact your school admin if it needs to change.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
