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

export default function CreateClassModal({ open, setOpen, fetcher }: any) {
  const [name, setName] = useState('');
  const [EducationalLevel, setEducationalLevel] = useState('');
  const [section, setSection] = useState('');
  const [year, setYear] = useState('');

  //close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setName('');
      setEducationalLevel('');
      setSection('');
      setYear('');
    }
  }, [fetcher.data]);

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

            <div className="space-y-6">
              <input type="hidden" name="_method" value="POST" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom Name
                </label>
                <Input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CLass 5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education level
                </label>
                <Input
                  name="EducationalLevel"
                  value={EducationalLevel}
                  onChange={(e) => setEducationalLevel(e.target.value)}
                  placeholder="e.g.  Grade 6"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <Input
                  name="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <Input
                  name="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2023"
                  required
                />
              </div>
            </div>
          </div>

          {/* sticky footer */}
          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-16 rounded-[8px] cursor-pointer duration-300 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer duration-300 hover:bg-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] disabled:opacity-50 disabled:cursor-not-allowed"
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
