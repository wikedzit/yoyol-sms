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

export default function EditClassModal({
  open,
  setOpen,
  fetcher,
  editingClass,
}: any) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (editingClass) setName(editingClass.name);
  }, [editingClass]);

  if (!editingClass) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col justify-between"
      >
        <fetcher.Form
          method="post"
          className="flex flex-col justify-between h-full"
          onSubmit={() => setOpen(false)}
        >
          {/* header */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  Edit Classroom
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>
            <p className="text-sm text-[#898989] mb-8">
              Update the name of this classroom.
            </p>

            {/* Input */}
            <input type="hidden" name="_method" value="PUT" />
            <input type="hidden" name="id" value={editingClass.id} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classroom Name
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Advanced Physics"
                required
              />
            </div>
          </div>

          {/* sticky footer */}
          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {fetcher.state === 'submitting'
                ? 'Updating...'
                : 'Update Classroom'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
