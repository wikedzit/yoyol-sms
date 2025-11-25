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
  const [editingSection, setEditingSection] = useState(
    editingClass?.section || ''
  );
  const [editingYear, setEditingYear] = useState<number | undefined>(
    editingClass?.year
  );

  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name);
      setEditingEducationalLevel(editingClass.EducationalLevel);
      setEditingSection(editingClass.section);
      setEditingYear(editingClass.year);
    }
  }, [editingClass]);

  // Close modal on successful update
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
        className="
          w-full max-w-full                /* Mobile full-screen */
          sm:max-w-[90%]                   /* Tablet */
          md:max-w-[573px] md:w-[573px]    /* Desktop fixed width */
          p-6 md:p-10
          flex flex-col justify-between
        "
      >
        <fetcher.Form
          method="post"
          action={id ? `/departments/${id}` : '/classes'}
          className="flex flex-col justify-between h-full"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                Edit Classroom
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer mt-2 md:mt-0">
              <X size={24} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-6 md:mb-8">
            Update the details of this classroom.
          </p>

          {/* Inputs */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
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
                Education Level
              </label>
              <Input
                name="EducationalLevel"
                value={editingEducationalLevel}
                onChange={(e) => setEditingEducationalLevel(e.target.value)}
                placeholder="e.g. Grade 6"
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
                type="number"
                value={editingYear || ''}
                onChange={(e) =>
                  setEditingYear(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder="e.g. 2023"
                required
              />
            </div>
          </div>

          {/* Sticky Footer */}
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
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto"
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
