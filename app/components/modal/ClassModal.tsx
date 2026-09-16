import { useState, useEffect } from 'react';
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

  // Populate form when editing or clear when creating
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
          w-full max-w-full 
          sm:max-w-[420px] 
          md:max-w-[500px] 
          lg:!max-w-[573px] lg:!w-[573px]
          p-6 md:p-10 flex flex-col
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value={isEditing ? 'PUT' : 'POST'} />
          {isEditing && editingClass?.id && (
            <input type="hidden" name="id" value={editingClass.id} />
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                {isEditing ? 'Edit Class' : 'Create Class'}
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            {isEditing
              ? 'Update the details of this class.'
              : `Add a new class${formName ? ` to ${formName}` : ''}.`}
          </p>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Class Name *
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

          {/* Sticky Footer - Theme Adaptive */}
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
              disabled={!name.trim() || fetcher.state === 'submitting'}
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
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