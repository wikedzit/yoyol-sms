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
import { useState } from 'react';

export default function CreateClassModal({ open, setOpen, fetcher }: any) {
  const [name, setName] = useState('');

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
                  Create Classroom
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>
            <p className="text-sm text-[#898989] mb-8">
              Fill in the details below to create a new classroom.
            </p>

            {/* input */}
            <input type="hidden" name="_method" value="POST" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classroom Name
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grade 6 Science"
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
                ? 'Creating...'
                : 'Create Classroom'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
