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
  id,
}: any) {
  const [name, setName] = useState(editingClass?.name || '');
  const [editingEducationalLevel, setEditingEducationalLevel] = useState(
    editingClass?.EducationalLevel || ''
  );
  const [editingSection, setEditingSection] = useState(editingClass?.section || '');
  const [editingYear, setEditingYear] = useState<number | undefined>(editingClass?.year);

  useEffect(() => {
    if (editingClass) setName(editingClass.name);
    if (editingClass) setEditingEducationalLevel(editingClass.EducationalLevel);
    if (editingClass) setEditingSection(editingClass.section);
    if (editingClass) setEditingYear(editingClass.year);
  }, [editingClass]);

  // Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
    }
    if (fetcher.data?.error) {
      console.error('Error updating classroom:', fetcher.data.error);
      alert(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  if (!editingClass) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col justify-between"
      >
        <fetcher.Form
          method="post"
          action={id ? `/departments/${id}` : '/classes'}
          className="flex flex-col justify-between h-full"
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
            <input type="hidden" name="_entity" value="class" />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Education level
              </label>
              <Input
                name="EducationalLevel"
                value={editingEducationalLevel}
                onChange={(e) => setEditingEducationalLevel(e.target.value)}
                placeholder="e.g. Advanced Physics"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <Input
                name="section"
                value={editingSection}
                onChange={(e) => setEditingSection(e.target.value)}
                placeholder="e.g. Advanced Physics"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <Input
                name="year"
                type="number"
                value={editingYear || ''}
                onChange={(e) => setEditingYear(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 2023"
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
              className="py-2 px-16 rounded-[8px] cursor-pointer duration-300 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer duration-300 hover:bg-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] disabled:opacity-50 disabled:cursor-not-allowed"
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
