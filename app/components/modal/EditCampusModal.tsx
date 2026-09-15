import { Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';

import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { toTitleCase } from '~/utils/strings';

interface EditCampusModalProps {
  campus: any;
}

export default function EditCampusModal({
  campus,
}: EditCampusModalProps) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
  });

  // Populate form when campus changes or modal opens
  useEffect(() => {
    if (campus && open) {
      setFormData({
        name: campus.name || '',
        code: campus.code || '',
        address: campus.address || '',
      });
    }
  }, [campus, open]);

  // Close modal after successful submission
  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data &&
      !fetcher.data.error
    ) {
      setOpen(false);

      // Refresh campus list/data
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    const formatted = ['name'].includes(name) ? toTitleCase(value) : value;

    setFormData((previous) => ({
      ...previous,
      [name]: formatted,
    }));
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);

    // Reset fetcher state when opening/closing if needed
    if (!value) {
      setFormData({
        name: campus?.name || '',
        code: campus?.code || '',
        address: campus?.address || '',
      });
    }
  };

  const isSubmitting = fetcher.state === 'submitting';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* Edit Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Edit campus"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <SheetContent
        side="right"
        className="
          w-full
          sm:max-w-[573px]
          p-6
          md:p-10
          flex
          flex-col
          bg-card
          text-card-foreground
        "
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl">
                Edit Campus
              </SheetTitle>
            </SheetHeader>

            <SheetClose asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </SheetClose>
          </div>

          {/* Description */}
          <p className="mb-6 text-sm text-muted-foreground">
            Update the campus information below.
          </p>

          {/* Form */}
          <fetcher.Form
            method="post"
            action={`/schools/${campus.schoolId}/campuses`}
            className="flex flex-1 flex-col"
          >
            {/* Method Override */}
            <input
              type="hidden"
              name="_method"
              value="PUT"
            />

            {/* Campus ID */}
            <input
              type="hidden"
              name="id"
              value={campus.id}
            />

            {/* Form Fields */}
            <div className="flex-1 space-y-4">
              {/* Campus Name */}
              <div>
                <label
                  htmlFor="campus-name"
                  className="mb-1 block text-sm font-medium"
                >
                  Campus Name
                </label>

                <Input
                  id="campus-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Campus Code */}
              <div>
                <label
                  htmlFor="campus-code"
                  className="mb-1 block text-sm font-medium"
                >
                  Campus Code
                </label>

                <Input
                  id="campus-code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="campus-address"
                  className="mb-1 block text-sm font-medium"
                >
                  Address
                </label>

                <Input
                  id="campus-address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              {/* Error */}
              {fetcher.data?.error && (
                <p className="text-sm text-destructive">
                  {fetcher.data.error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              {/* Cancel */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary-gradient text-white"
              >
                {isSubmitting
                  ? 'Updating...'
                  : 'Update Campus'}
              </Button>
            </div>
          </fetcher.Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
