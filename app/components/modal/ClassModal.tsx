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
import type { FetcherWithComponents } from 'react-router';

interface ClassData {
  id?: number;
  name: string;
  formId: number;
  streamId: number;
  levelId: number;
  studentCount?: number;
}

interface ClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  editingClass?: ClassData | null;
  formName?: string;
}

export function ClassModal({
  open,
  setOpen,
  fetcher,
  editingClass,
  formName,
}: ClassModalProps) {
  const [name, setName] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name);
    } else {
      setName('');
    }
  }, [editingClass, open]);

  // Close modal on successful operation
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      setName('');
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  const isEditing = Boolean(editingClass?.id);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full       /* Mobile full screen */
          sm:max-w-[90%]          /* Small tablets */
          md:max-w-[573px] md:w-[573px]  /* Desktop original width */
          p-6 md:p-10 
          flex flex-col justify-between
        "
      >
        <fetcher.Form method="post" className="flex flex-col justify-between h-full">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                {isEditing ? 'Edit Class' : 'Create Class'}
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer mt-2 md:mt-0">
              <X size={24} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-6 md:mb-8">
            {isEditing
              ? 'Update the details of this class.'
              : `Add a new class${formName ? ` to ${formName}` : ''}.`}
          </p>

          {/* FORM INPUTS */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            <input type="hidden" name="_method" value={isEditing ? 'PUT' : 'POST'} />
            {isEditing && editingClass?.id && (
              <input type="hidden" name="id" value={editingClass.id} />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Name
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 3A, 3B, 3C"
                required
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter a unique name for this class (e.g., 3A, 3B)
              </p>
            </div>
          </div>

          {/* STICKY FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || fetcher.state === 'submitting'}
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto"
            >
              {fetcher.state === 'submitting'
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                  ? 'Update Class'
                  : 'Create Class'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}

export default ClassModal;
